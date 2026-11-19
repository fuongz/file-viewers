use block2::RcBlock;
use objc2::{rc::Retained, runtime::AnyObject, MainThreadMarker};
use objc2_app_kit::{NSEvent, NSEventMask, NSEventType, NSTouchPhase, NSTouchTypeMask, NSView};
use serde::Serialize;
use std::{cell::Cell, ptr::NonNull};
use tauri::{Emitter, WebviewWindow, WindowEvent};

thread_local! {
    static MONITOR: Cell<Option<Retained<AnyObject>>> = const { Cell::new(None) };
}

#[derive(Clone, Serialize)]
#[serde(tag = "phase", rename_all = "lowercase")]
enum Gesture {
    Begin,
    Move { x: f64, y: f64 },
    End,
}

pub fn install(window: &WebviewWindow) -> tauri::Result<()> {
    let target = window.clone();
    window.with_webview(move |webview| {
        // Tauri runs this callback on the main thread. The platform webview is a WKWebView (NSView).
        let Some(view) = (unsafe { webview.inner().cast::<NSView>().as_ref() }) else {
            return;
        };
        view.setAllowedTouchTypes(view.allowedTouchTypes() | NSTouchTypeMask::Indirect);
        let native_window = webview.ns_window().cast();
        let previous = Cell::new(None::<(f64, f64)>);
        let handler = RcBlock::new(move |pointer: NonNull<NSEvent>| {
            // AppKit passes a live event for the duration of this local monitor callback.
            let event = unsafe { pointer.as_ref() };
            let Some(main_thread) = MainThreadMarker::new() else {
                return pointer.as_ptr();
            };
            let in_window = event
                .window(main_thread)
                .is_none_or(|window| Retained::as_ptr(&window) == native_window);
            let active = in_window && event.r#type() != NSEventType::EndGesture;
            let touches =
                active.then(|| event.touchesMatchingPhase_inView(NSTouchPhase::Touching, None));
            let Some(touches) = touches.filter(|touches| touches.count() == 3) else {
                if previous.take().is_some() {
                    let _ = target.emit("schema-trackpad", Gesture::End);
                }
                return pointer.as_ptr();
            };
            let mut centroid = (0.0, 0.0);
            for touch in touches.allObjects().iter() {
                let position = touch.normalizedPosition();
                let device_size = touch.deviceSize();
                centroid.0 += position.x * device_size.width / 3.0;
                centroid.1 += position.y * device_size.height / 3.0;
            }
            let gesture = match previous.replace(Some(centroid)) {
                Some((x, y)) => Gesture::Move {
                    // Trackpad device sizes are in millimeters. Invert AppKit's Y axis.
                    x: (centroid.0 - x) * 5.0,
                    y: (y - centroid.1) * 5.0,
                },
                None => Gesture::Begin,
            };
            let _ = target.emit("schema-trackpad", gesture);
            pointer.as_ptr()
        });
        // This monitor only observes our application's events and returns them unchanged.
        let monitor = unsafe {
            NSEvent::addLocalMonitorForEventsMatchingMask_handler(
                NSEventMask::Gesture | NSEventMask::EndGesture,
                &handler,
            )
        };
        MONITOR.with(|slot| slot.set(monitor));
    })?;
    window.on_window_event(|event| {
        if let WindowEvent::Destroyed = event {
            MONITOR.with(|slot| {
                if let Some(monitor) = slot.take() {
                    // The token was returned by AppKit's monitor registration.
                    unsafe { NSEvent::removeMonitor(&monitor) };
                }
            });
        }
    });
    Ok(())
}

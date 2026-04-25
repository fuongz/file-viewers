/** biome-ignore-all lint/suspicious/noArrayIndexKey: no need */

const HEADER_WIDTHS = [72, 55, 88, 62, 78, 50, 68, 82];
const CELL_WIDTHS = [
	[68, 42, 75, 58, 82, 45, 70, 55],
	[52, 78, 48, 88, 62, 72, 44, 66],
	[80, 50, 70, 44, 90, 55, 78, 48],
	[60, 85, 55, 72, 40, 80, 52, 74],
	[74, 46, 84, 60, 70, 48, 88, 58],
	[48, 72, 62, 50, 78, 66, 42, 80],
	[82, 54, 44, 76, 56, 84, 60, 46],
	[58, 80, 68, 40, 86, 52, 76, 62],
	[70, 44, 78, 64, 48, 74, 56, 84],
	[46, 68, 52, 82, 66, 42, 80, 58],
	[86, 58, 72, 46, 76, 62, 48, 70],
	[62, 76, 40, 70, 54, 86, 64, 44],
];
const SKELETON_COLS = 6;
const SKELETON_ROWS = 12;

export function TableSkeleton() {
	return (
		<div>
			<div>
				<div>
					<div className="size-3 rounded animate-pulse bg-[var(--border)]" />
					<div className="h-3 w-36 rounded animate-pulse bg-[var(--border)] ml-2" />
				</div>
			</div>
			<div className="csv-table-wrapper">
				<table className="csv-table w-full">
					<thead>
						<tr>
							<th>
								<div className="h-3 w-3 rounded animate-pulse bg-[var(--border)]" />
							</th>
							{Array.from({ length: SKELETON_COLS }).map((_, i) => (
								<th key={i} style={{ width: 150 }}>
									<div
										className="h-3 rounded animate-pulse bg-[var(--border)]"
										style={{
											width: `${HEADER_WIDTHS[i % HEADER_WIDTHS.length]}%`,
										}}
									/>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{Array.from({ length: SKELETON_ROWS }).map((_, rowIdx) => (
							<tr key={rowIdx}>
								<td className="csv-row-num">
									<div className="h-3 w-4 rounded animate-pulse bg-[var(--border)]" />
								</td>
								{Array.from({ length: SKELETON_COLS }).map((_, colIdx) => (
									<td key={colIdx}>
										<div
											className="h-3 rounded animate-pulse bg-[var(--border)]"
											style={{
												width: `${CELL_WIDTHS[rowIdx % CELL_WIDTHS.length][colIdx % CELL_WIDTHS[0].length]}%`,
											}}
										/>
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="csv-statusbar">
				<div className="h-3 w-32 rounded animate-pulse bg-[var(--border)]" />
			</div>
		</div>
	);
}

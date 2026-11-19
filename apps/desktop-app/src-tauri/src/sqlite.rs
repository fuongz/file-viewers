use rusqlite::{
    config::DbConfig,
    hooks::{AuthAction, AuthContext, Authorization},
    params_from_iter,
    types::{Value, ValueRef},
    Connection, OpenFlags, OptionalExtension, Params, Statement,
};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    time::{Duration, Instant},
};
use tauri::{AppHandle, Manager};
use tauri_plugin_fs::FsExt;

const PAGE_SIZE: usize = 50;
const MAX_PAGE_SIZE: u32 = 1000;
const QUERY_LIMIT: usize = 500;
const TEXT_PREVIEW_BYTES: usize = 1024;

#[derive(Serialize)]
pub struct SqliteRelation {
    name: String,
    kind: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SchemaTable {
    name: String,
    columns: Vec<SchemaColumn>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SchemaColumn {
    name: String,
    type_name: String,
    primary_key: bool,
    references: Option<SchemaReference>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SchemaReference {
    table: String,
    column: String,
}

#[derive(Serialize)]
#[serde(tag = "kind", content = "value", rename_all = "camelCase")]
enum Cell {
    Null,
    Number(String),
    Text(String),
    Blob(usize),
}

impl From<ValueRef<'_>> for Cell {
    fn from(value: ValueRef<'_>) -> Self {
        match value {
            ValueRef::Null => Self::Null,
            ValueRef::Integer(value) => Self::Number(value.to_string()),
            ValueRef::Real(value) => Self::Number(value.to_string()),
            ValueRef::Text(value) if value.len() > TEXT_PREVIEW_BYTES => {
                let prefix = String::from_utf8_lossy(&value[..TEXT_PREVIEW_BYTES]);
                Self::Text(format!("{prefix}…"))
            }
            ValueRef::Text(value) => Self::Text(String::from_utf8_lossy(value).into_owned()),
            ValueRef::Blob(value) => Self::Blob(value.len()),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SqlitePage {
    columns: Vec<String>,
    rows: Vec<Vec<Cell>>,
    has_more: bool,
    column_details: Vec<ColumnDetails>,
    editable: bool,
    row_keys: Vec<Vec<RowKey>>,
    query_time_ms: f64,
}

#[derive(Deserialize)]
pub struct SqliteSort {
    column: u16,
    descending: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ColumnDetails {
    name: String,
    primary_key: bool,
    not_null: bool,
    default_value: Option<String>,
    references: Vec<String>,
    indexes: Vec<ColumnIndex>,
    hidden: bool,
}

#[derive(Serialize)]
struct ColumnIndex {
    name: String,
    unique: bool,
    partial: bool,
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "kind", content = "value", rename_all = "camelCase")]
pub enum RowKey {
    Null,
    Integer(String),
    Real(f64),
    Text(String),
    Blob(Vec<u8>),
}

impl RowKey {
    fn from_sqlite(value: ValueRef<'_>) -> rusqlite::Result<Self> {
        Ok(match value {
            ValueRef::Null => Self::Null,
            ValueRef::Integer(value) => Self::Integer(value.to_string()),
            ValueRef::Real(value) => Self::Real(value),
            ValueRef::Text(value) => Self::Text(
                std::str::from_utf8(value)
                    .map_err(|_| rusqlite::Error::InvalidQuery)?
                    .to_owned(),
            ),
            ValueRef::Blob(value) => Self::Blob(value.to_vec()),
        })
    }

    fn into_sqlite(self) -> rusqlite::Result<Value> {
        Ok(match self {
            Self::Null => Value::Null,
            Self::Integer(value) => {
                Value::Integer(value.parse().map_err(|_| rusqlite::Error::InvalidQuery)?)
            }
            Self::Real(value) => Value::Real(value),
            Self::Text(value) => Value::Text(value),
            Self::Blob(value) => Value::Blob(value),
        })
    }
}

#[derive(Deserialize)]
pub struct Filter {
    column: String,
    operator: FilterOperator,
    value: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
enum FilterOperator {
    Eq,
    Ne,
    Gt,
    Ge,
    Lt,
    Le,
    Like,
    NotLike,
    IsNull,
    IsNotNull,
}

impl FilterOperator {
    fn sql(&self) -> (&'static str, bool) {
        match self {
            Self::Eq => ("=", true),
            Self::Ne => ("!=", true),
            Self::Gt => (">", true),
            Self::Ge => (">=", true),
            Self::Lt => ("<", true),
            Self::Le => ("<=", true),
            Self::Like => ("LIKE", true),
            Self::NotLike => ("NOT LIKE", true),
            Self::IsNull => ("IS NULL", false),
            Self::IsNotNull => ("IS NOT NULL", false),
        }
    }
}

#[derive(Deserialize)]
pub struct InsertValue {
    column: String,
    value: String,
}

fn identifier(name: &str) -> String {
    format!("\"{}\"", name.replace('"', "\"\""))
}

fn authorized_path(app: &AppHandle, path: &str) -> Result<PathBuf, String> {
    let path = fs::canonicalize(path).map_err(|error| error.to_string())?;
    let scope = app.fs_scope();
    // The file plugin also accepts home paths via its static capability.
    let in_home = app
        .path()
        .home_dir()
        .ok()
        .and_then(|home| home.canonicalize().ok())
        .is_some_and(|home| path.starts_with(home));
    if scope.is_forbidden(&path) || !(in_home || scope.is_allowed(&path)) {
        return Err("Open the database with the file picker to grant access.".into());
    }
    if !path.is_file() {
        return Err("Select a SQLite database file.".into());
    }
    Ok(path)
}

fn open_connection(path: &Path, access: OpenFlags) -> rusqlite::Result<Connection> {
    let mut db = Connection::open_with_flags(
        path,
        access | OpenFlags::SQLITE_OPEN_NO_MUTEX | OpenFlags::SQLITE_OPEN_NOFOLLOW,
    )?;
    db.busy_timeout(Duration::from_secs(1))?;
    db.set_db_config(DbConfig::SQLITE_DBCONFIG_TRUSTED_SCHEMA, false)?;
    db.set_db_config(DbConfig::SQLITE_DBCONFIG_ENABLE_FKEY, true)?;
    let deadline = Instant::now() + Duration::from_secs(3);
    db.progress_handler(2_000, Some(move || Instant::now() >= deadline))?;
    Ok(db)
}

fn relations(db: &Connection) -> rusqlite::Result<Vec<SqliteRelation>> {
    let mut statement = db.prepare(
        "SELECT name, type FROM main.sqlite_schema WHERE type IN ('table', 'view')
         ORDER BY type, name COLLATE NOCASE, name",
    )?;
    let rows = statement.query_map([], |row| {
        Ok(SqliteRelation {
            name: row.get(0)?,
            kind: row.get(1)?,
        })
    })?;
    rows.collect()
}

fn schema_diagram(db: &Connection) -> rusqlite::Result<Vec<SchemaTable>> {
    let mut statement = db.prepare(
        "SELECT name FROM main.sqlite_schema
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
         ORDER BY name COLLATE NOCASE",
    )?;
    let names = statement
        .query_map([], |row| row.get::<_, String>(0))?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut tables = Vec::with_capacity(names.len());
    for name in names {
        let mut columns = db
            .prepare(
                r#"SELECT name, type, pk FROM pragma_table_xinfo(?1, 'main')
                   WHERE hidden = 0 ORDER BY cid"#,
            )?
            .query_map([&name], |row| {
                Ok(SchemaColumn {
                    name: row.get(0)?,
                    type_name: row.get::<_, Option<String>>(1)?.unwrap_or_default(),
                    primary_key: row.get::<_, i64>(2)? > 0,
                    references: None,
                })
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;

        let mut references =
            db.prepare(r#"SELECT "from", "table", "to" FROM pragma_foreign_key_list(?1, 'main')"#)?;
        let mut rows = references.query([&name])?;
        while let Some(row) = rows.next()? {
            let from: String = row.get(0)?;
            let target: String = row.get(1)?;
            let to: Option<String> = row.get(2)?;
            if let Some(column) = columns.iter_mut().find(|column| column.name == from) {
                column.references = Some(SchemaReference {
                    table: target,
                    column: to.unwrap_or_default(),
                });
            }
        }

        tables.push(SchemaTable { name, columns });
    }
    Ok(tables)
}

fn column_details(db: &Connection, table: &str) -> rusqlite::Result<Vec<ColumnDetails>> {
    let mut statement = db.prepare(
        r#"SELECT name, pk, "notnull", dflt_value, hidden FROM pragma_table_xinfo(?1, 'main')"#,
    )?;
    let columns = statement
        .query_map([table], |row| {
            Ok(ColumnDetails {
                name: row.get(0)?,
                primary_key: row.get::<_, i64>(1)? > 0,
                not_null: row.get(2)?,
                default_value: row.get(3)?,
                references: Vec::new(),
                indexes: Vec::new(),
                hidden: row.get::<_, i64>(4)? != 0,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    let mut columns = columns;
    let mut references =
        db.prepare(r#"SELECT "from", "table", "to" FROM pragma_foreign_key_list(?1, 'main')"#)?;
    let mut rows = references.query([table])?;
    while let Some(row) = rows.next()? {
        let name: String = row.get(0)?;
        if let Some(column) = columns.iter_mut().find(|column| column.name == name) {
            let target: String = row.get(1)?;
            let field: Option<String> = row.get(2)?;
            column.references.push(match field {
                Some(field) => format!("{target}.{field}"),
                None => target,
            });
        }
    }
    let mut indexes = db.prepare(
        r#"SELECT info.name, idx.name, idx."unique", idx.partial
           FROM pragma_index_list(?1, 'main') AS idx
           JOIN pragma_index_xinfo(idx.name, 'main') AS info
           WHERE info."key" AND info.name IS NOT NULL
           ORDER BY idx.name"#,
    )?;
    let mut rows = indexes.query([table])?;
    while let Some(row) = rows.next()? {
        let name: String = row.get(0)?;
        if let Some(column) = columns.iter_mut().find(|column| column.name == name) {
            column.indexes.push(ColumnIndex {
                name: row.get(1)?,
                unique: row.get(2)?,
                partial: row.get(3)?,
            });
        }
    }
    Ok(columns)
}

fn read_page(
    db: &Connection,
    name: &str,
    offset: u32,
    limit: u32,
    sort: Option<SqliteSort>,
    filter: Option<Filter>,
) -> rusqlite::Result<SqlitePage> {
    let started = Instant::now();
    let limit = limit.clamp(1, MAX_PAGE_SIZE) as usize;
    let columns = column_details(db, name)?;
    let (editable, keys) = table_identity(db, name, &columns)?;
    let mut params = vec![
        Value::Integer(limit as i64 + 1),
        Value::Integer(i64::from(offset)),
    ];
    let predicate = if let Some(filter) = filter {
        if !columns.iter().any(|column| column.name == filter.column) {
            return Err(rusqlite::Error::InvalidQuery);
        }
        let (operator, takes_value) = filter.operator.sql();
        if takes_value {
            params.push(Value::Text(
                filter.value.ok_or(rusqlite::Error::InvalidQuery)?,
            ));
        }
        let parameter = if takes_value { " ?3" } else { "" };
        format!(
            " WHERE {} {operator}{parameter}",
            identifier(&filter.column)
        )
    } else {
        String::new()
    };
    let order = sort.map_or_else(String::new, |sort| {
        let ordinal = u32::from(sort.column) + 1;
        let direction = if sort.descending { "DESC" } else { "ASC" };
        format!(" ORDER BY {ordinal} {direction}")
    });
    let key_columns = keys
        .iter()
        .map(|key| format!(", {}", identifier(key)))
        .collect::<String>();
    let statement = db.prepare(&format!(
        "SELECT *{key_columns} FROM main.{}{predicate}{order} LIMIT ?1 OFFSET ?2",
        identifier(name)
    ))?;
    if statement.column_count() <= keys.len() {
        return Err(rusqlite::Error::InvalidQuery);
    }
    let mut page = collect_rows(statement, params_from_iter(params), limit, keys.len())?;
    page.column_details = columns;
    page.editable = editable;
    page.query_time_ms = started.elapsed().as_secs_f64() * 1000.0;
    Ok(page)
}

fn table_identity(
    db: &Connection,
    name: &str,
    columns: &[ColumnDetails],
) -> rusqlite::Result<(bool, Vec<String>)> {
    let without_rowid = db.query_row(
        "SELECT wr FROM pragma_table_list(?1) WHERE schema = 'main' AND name = ?1 AND type = 'table'",
        [name],
        |row| row.get::<_, bool>(0),
    ).optional()?;
    let Some(without_rowid) =
        without_rowid.filter(|_| !name.to_ascii_lowercase().starts_with("sqlite_"))
    else {
        return Ok((false, Vec::new()));
    };
    let primary: Vec<_> = columns.iter().filter(|column| column.primary_key).collect();
    if !primary.is_empty() && (without_rowid || primary.iter().all(|column| column.not_null)) {
        return Ok((
            true,
            primary.iter().map(|column| column.name.clone()).collect(),
        ));
    }
    let rowid = ["rowid", "_rowid_", "oid"].into_iter().find(|alias| {
        !columns
            .iter()
            .any(|column| column.name.eq_ignore_ascii_case(alias))
    });
    Ok((true, rowid.into_iter().map(str::to_owned).collect()))
}

fn collect_rows(
    mut statement: Statement<'_>,
    params: impl Params,
    limit: usize,
    key_count: usize,
) -> rusqlite::Result<SqlitePage> {
    let columns: Vec<String> = statement
        .column_names()
        .into_iter()
        .take(statement.column_count() - key_count)
        .map(str::to_owned)
        .collect();
    let mut cursor = statement.query(params)?;
    let mut rows = Vec::new();
    let mut row_keys = Vec::new();
    while rows.len() < limit {
        let Some(row) = cursor.next()? else { break };
        let cells = (0..columns.len())
            .map(|index| row.get_ref(index).map(Cell::from))
            .collect::<rusqlite::Result<_>>()?;
        rows.push(cells);
        if key_count != 0 {
            row_keys.push(
                (columns.len()..columns.len() + key_count)
                    .map(|index| row.get_ref(index).and_then(RowKey::from_sqlite))
                    .collect::<rusqlite::Result<_>>()?,
            );
        }
    }
    Ok(SqlitePage {
        columns,
        rows,
        has_more: cursor.next()?.is_some(),
        column_details: Vec::new(),
        editable: false,
        row_keys,
        query_time_ms: 0.0,
    })
}

fn readonly_authorizer(context: AuthContext<'_>) -> Authorization {
    match context.action {
        AuthAction::Select
        | AuthAction::Read { .. }
        | AuthAction::Recursive
        | AuthAction::Transaction { .. }
        | AuthAction::Savepoint { .. } => Authorization::Allow,
        AuthAction::Function { function_name }
            if !function_name.eq_ignore_ascii_case("load_extension") =>
        {
            Authorization::Allow
        }
        _ => Authorization::Deny,
    }
}

fn run_statement_page(db: &Connection, sql: &str) -> rusqlite::Result<SqlitePage> {
    let started = Instant::now();
    let statement = db.prepare(sql)?;
    if !statement.readonly() || statement.column_count() == 0 {
        return Err(rusqlite::Error::InvalidQuery);
    }
    let mut page = collect_rows(statement, [], QUERY_LIMIT, 0)?;
    page.query_time_ms = started.elapsed().as_secs_f64() * 1000.0;
    Ok(page)
}

fn run_query(db: &mut Connection, sql: &str) -> rusqlite::Result<SqlitePage> {
    db.authorizer(Some(readonly_authorizer))?;
    run_statement_page(db, sql)
}

fn run_statements(
    db: &mut Connection,
    statements: Vec<String>,
    transaction: bool,
    explain: bool,
) -> rusqlite::Result<SqlitePage> {
    db.authorizer(Some(readonly_authorizer))?;
    let transaction = if transaction {
        Some(db.unchecked_transaction()?)
    } else {
        None
    };
    let mut last: Option<SqlitePage> = None;
    for statement in statements {
        let statement = statement.trim();
        if statement.is_empty() {
            continue;
        }
        let statement = statement.trim_end_matches(';').trim();
        let sql = if explain {
            format!("EXPLAIN QUERY PLAN {statement}")
        } else {
            statement.to_owned()
        };
        last = Some(run_statement_page(db, &sql)?);
    }
    if let Some(transaction) = transaction {
        transaction.commit()?;
    }
    last.ok_or(rusqlite::Error::InvalidQuery)
}

async fn with_database<T: Send + 'static>(
    app: AppHandle,
    path: String,
    access: OpenFlags,
    read: impl FnOnce(&mut Connection) -> rusqlite::Result<T> + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let path = authorized_path(&app, &path)?;
        open_connection(&path, access)
            .and_then(|mut db| read(&mut db))
            .map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn sqlite_relations(app: AppHandle, path: String) -> Result<Vec<SqliteRelation>, String> {
    with_database(app, path, OpenFlags::SQLITE_OPEN_READ_ONLY, |db| {
        relations(db)
    })
    .await
}

#[tauri::command]
pub async fn sqlite_schema(app: AppHandle, path: String) -> Result<Vec<SchemaTable>, String> {
    with_database(app, path, OpenFlags::SQLITE_OPEN_READ_ONLY, |db| {
        schema_diagram(db)
    })
    .await
}

#[tauri::command]
pub async fn sqlite_page(
    app: AppHandle,
    path: String,
    name: String,
    offset: u32,
    limit: Option<u32>,
    sort: Option<SqliteSort>,
    filter: Option<Filter>,
) -> Result<SqlitePage, String> {
    with_database(app, path, OpenFlags::SQLITE_OPEN_READ_ONLY, move |db| {
        read_page(
            db,
            &name,
            offset,
            limit.unwrap_or(PAGE_SIZE as u32),
            sort,
            filter,
        )
    })
    .await
}

#[tauri::command]
pub async fn sqlite_query(app: AppHandle, path: String, sql: String) -> Result<SqlitePage, String> {
    with_database(app, path, OpenFlags::SQLITE_OPEN_READ_ONLY, move |db| {
        run_query(db, &sql)
    })
    .await
}

#[tauri::command]
pub async fn sqlite_exec(
    app: AppHandle,
    path: String,
    statements: Vec<String>,
    transaction: bool,
    explain: bool,
) -> Result<SqlitePage, String> {
    with_database(app, path, OpenFlags::SQLITE_OPEN_READ_ONLY, move |db| {
        run_statements(db, statements, transaction, explain)
    })
    .await
}

fn insert_row(db: &Connection, table: &str, values: Vec<InsertValue>) -> rusqlite::Result<()> {
    let columns = column_details(db, table)?;
    if !table_identity(db, table, &columns)?.0 {
        return Err(rusqlite::Error::InvalidQuery);
    }
    let target = identifier(table);
    if values.is_empty() {
        db.execute(&format!("INSERT INTO main.{target} DEFAULT VALUES"), [])?;
        return Ok(());
    }
    let mut names = Vec::new();
    let mut params = Vec::new();
    for value in values {
        if !columns
            .iter()
            .any(|column| column.name == value.column && !column.hidden)
            || names.contains(&identifier(&value.column))
        {
            return Err(rusqlite::Error::InvalidQuery);
        }
        names.push(identifier(&value.column));
        params.push(value.value);
    }
    let names = names.join(", ");
    let placeholders = vec!["?"; params.len()].join(", ");
    db.execute(
        &format!("INSERT INTO main.{target} ({names}) VALUES ({placeholders})"),
        params_from_iter(params),
    )?;
    Ok(())
}

fn delete_row(db: &Connection, table: &str, key: Vec<RowKey>) -> rusqlite::Result<()> {
    let transaction = db.unchecked_transaction()?;
    let columns = column_details(&transaction, table)?;
    let (_, identity) = table_identity(&transaction, table, &columns)?;
    if identity.is_empty() || key.len() != identity.len() {
        return Err(rusqlite::Error::InvalidQuery);
    }
    let predicate = identity
        .iter()
        .map(|name| format!("{} IS ?", identifier(name)))
        .collect::<Vec<_>>()
        .join(" AND ");
    let params = key
        .into_iter()
        .map(RowKey::into_sqlite)
        .collect::<rusqlite::Result<Vec<_>>>()?;
    let count = transaction.execute(
        &format!("DELETE FROM main.{} WHERE {predicate}", identifier(table)),
        params_from_iter(params),
    )?;
    if count != 1 {
        return Err(rusqlite::Error::QueryReturnedNoRows);
    }
    transaction.commit()
}

fn update_cell(
    db: &Connection,
    table: &str,
    key: Vec<RowKey>,
    column: &str,
    value: String,
) -> rusqlite::Result<()> {
    let transaction = db.unchecked_transaction()?;
    let columns = column_details(&transaction, table)?;
    let (_, identity) = table_identity(&transaction, table, &columns)?;
    if identity.is_empty()
        || key.len() != identity.len()
        || !columns
            .iter()
            .any(|field| field.name == column && !field.hidden)
    {
        return Err(rusqlite::Error::InvalidQuery);
    }
    let predicate = identity
        .iter()
        .map(|name| format!("{} IS ?", identifier(name)))
        .collect::<Vec<_>>()
        .join(" AND ");
    let mut params = vec![Value::Text(value)];
    params.extend(
        key.into_iter()
            .map(RowKey::into_sqlite)
            .collect::<rusqlite::Result<Vec<_>>>()?,
    );
    let count = transaction.execute(
        &format!(
            "UPDATE main.{} SET {} = ? WHERE {predicate}",
            identifier(table),
            identifier(column)
        ),
        params_from_iter(params),
    )?;
    if count != 1 {
        return Err(rusqlite::Error::QueryReturnedNoRows);
    }
    transaction.commit()
}

#[tauri::command]
pub async fn sqlite_insert(
    app: AppHandle,
    path: String,
    name: String,
    values: Vec<InsertValue>,
) -> Result<(), String> {
    with_database(app, path, OpenFlags::SQLITE_OPEN_READ_WRITE, move |db| {
        insert_row(db, &name, values)
    })
    .await
}

#[tauri::command]
pub async fn sqlite_update(
    app: AppHandle,
    path: String,
    name: String,
    key: Vec<RowKey>,
    column: String,
    value: String,
) -> Result<(), String> {
    with_database(app, path, OpenFlags::SQLITE_OPEN_READ_WRITE, move |db| {
        update_cell(db, &name, key, &column, value)
    })
    .await
}

#[tauri::command]
pub async fn sqlite_delete(
    app: AppHandle,
    path: String,
    name: String,
    key: Vec<RowKey>,
) -> Result<(), String> {
    with_database(app, path, OpenFlags::SQLITE_OPEN_READ_WRITE, move |db| {
        delete_row(db, &name, key)
    })
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn filters_bind_values_and_only_accept_known_columns() {
        let db = Connection::open_in_memory().unwrap();
        db.execute_batch(
            "CREATE TABLE events(id INTEGER PRIMARY KEY, label TEXT, parent_id INTEGER REFERENCES events(id));
             CREATE UNIQUE INDEX by_label ON events(label);
             INSERT INTO events VALUES(1, 'normal', NULL), (2, 'second', 1);",
        ).unwrap();
        let literal = "' OR 1=1 --";
        insert_row(
            &db,
            "events",
            vec![InsertValue {
                column: "label".into(),
                value: literal.into(),
            }],
        )
        .unwrap();
        let result = read_page(
            &db,
            "events",
            0,
            PAGE_SIZE as u32,
            None,
            Some(Filter {
                column: "label".into(),
                operator: FilterOperator::Eq,
                value: Some(literal.into()),
            }),
        )
        .unwrap();
        assert_eq!(result.rows.len(), 1);
        assert!(result.column_details[0].primary_key);
        assert!(result.column_details[1].indexes[0].unique);
        assert_eq!(result.column_details[2].references, ["events.id"]);
        assert!(read_page(
            &db,
            "events",
            0,
            PAGE_SIZE as u32,
            None,
            Some(Filter {
                column: "bogus".into(),
                operator: FilterOperator::Eq,
                value: Some(literal.into()),
            })
        )
        .is_err());
        let descending = read_page(
            &db,
            "events",
            0,
            PAGE_SIZE as u32,
            Some(SqliteSort {
                column: 0,
                descending: true,
            }),
            None,
        )
        .unwrap();
        assert!(matches!(&descending.rows[0][0], Cell::Number(value) if value == "3"));
        delete_row(&db, "events", result.row_keys.into_iter().next().unwrap()).unwrap();
        assert_eq!(
            read_page(&db, "events", 0, PAGE_SIZE as u32, None, None)
                .unwrap()
                .rows
                .len(),
            2
        );
    }

    #[test]
    fn updates_only_the_selected_row_and_binds_the_cell_value() {
        let db = Connection::open_in_memory().unwrap();
        db.execute_batch(
            "CREATE TABLE events(id INTEGER PRIMARY KEY, label TEXT);
			 INSERT INTO events VALUES(1, 'first'), (2, 'second');",
        )
        .unwrap();
        let literal = "changed', label = 'all rows' --";
        update_cell(
            &db,
            "events",
            vec![RowKey::Integer("1".into())],
            "label",
            literal.into(),
        )
        .unwrap();
        let labels = db
            .prepare("SELECT label FROM events ORDER BY id")
            .unwrap()
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<rusqlite::Result<Vec<_>>>()
            .unwrap();
        assert_eq!(labels, [literal, "second"]);
        assert!(update_cell(
            &db,
            "events",
            vec![RowKey::Integer("1".into())],
            "label\" = 'all rows' --",
            "bad".into(),
        )
        .is_err());
    }

    #[test]
    fn query_supports_ctes_with_bounded_results_and_rejects_writes() {
        let mut db = Connection::open_in_memory().unwrap();
        db.execute("CREATE TABLE events (id INTEGER)", []).unwrap();
        let result = run_query(&mut db,
            "WITH RECURSIVE counters(n) AS (VALUES(1) UNION ALL SELECT n + 1 FROM counters WHERE n <= 500)
             SELECT n FROM counters; -- query"
        ).unwrap();
        assert_eq!(result.rows.len(), QUERY_LIMIT);
        assert!(result.has_more);
        assert!(run_query(&mut db, "SELECT 1; SELECT 2").is_err());
        assert!(run_query(&mut db, "INSERT INTO events VALUES(1) RETURNING id").is_err());
        assert!(run_query(&mut db, "ATTACH DATABASE ':memory:' AS other").is_err());
    }

    #[test]
    fn reads_pages_from_a_database_with_wal_without_writing_to_it() {
        let path = std::env::temp_dir().join(format!(
            "file-viewers-sqlite-{}-{}.db",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        struct DatabaseFile(PathBuf);
        impl Drop for DatabaseFile {
            fn drop(&mut self) {
                let _ = fs::remove_file(&self.0);
            }
        }
        let fixture = DatabaseFile(path);
        let writer = Connection::open(&fixture.0).unwrap();
        writer
            .execute_batch(
                "PRAGMA journal_mode = WAL;
                 PRAGMA wal_autocheckpoint = 0;
                 CREATE TABLE \"odd\"\" table\" (id INTEGER PRIMARY KEY, note TEXT, payload BLOB);
                 WITH RECURSIVE ids(id) AS (VALUES(1) UNION ALL SELECT id + 1 FROM ids WHERE id < 51)
                 INSERT INTO \"odd\"\" table\" SELECT id, NULL, x'0011' FROM ids;
                 CREATE VIEW \"recent rows\" AS SELECT * FROM \"odd\"\" table\" WHERE id > 50;",
            )
            .unwrap();

        let reader = open_connection(
            &fixture.0.canonicalize().unwrap(),
            OpenFlags::SQLITE_OPEN_READ_ONLY,
        )
        .unwrap();
        let objects = relations(&reader).unwrap();
        assert_eq!(objects[0].name, "odd\" table");
        assert_eq!(objects[1].kind, "view");
        let first = read_page(&reader, "odd\" table", 0, PAGE_SIZE as u32, None, None).unwrap();
        assert_eq!(first.columns, ["id", "note", "payload"]);
        assert_eq!(first.rows.len(), PAGE_SIZE);
        assert!(first.has_more);
        assert!(matches!(&first.rows[0][1..], [Cell::Null, Cell::Blob(2)]));
        let next = read_page(
            &reader,
            "odd\" table",
            PAGE_SIZE as u32,
            PAGE_SIZE as u32,
            None,
            None,
        )
        .unwrap();
        assert_eq!(next.rows.len(), 1);
        assert!(!next.has_more);
        assert!(matches!(&next.rows[0][0], Cell::Number(value) if value == "51"));
        assert_eq!(
            read_page(&reader, "recent rows", 0, PAGE_SIZE as u32, None, None)
                .unwrap()
                .rows
                .len(),
            1
        );
        assert!(reader
            .execute("CREATE TABLE blocked (id INTEGER)", [])
            .is_err());
    }
}

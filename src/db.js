const config = require('./config')
const sqlite3 = require('sqlite3')

const RECORDS_SQL = `CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  "indoor-barometric-pressure" REAL,
  "indoor-humidity" REAL,
  "indoor-temperature" REAL,
  "outdoor-gust-speed" REAL,
  "outdoor-hourly-rainfall" REAL,
  "outdoor-humidity" REAL,
  "outdoor-temperature" REAL,
  "outdoor-wind-direction" REAL,
  "outdoor-wind-speed" REAL
);`
const RECORDS_TIMESTAMP_IDX_SQL = `CREATE INDEX IF NOT EXISTS idx_records_timestamp
  ON records (timestamp);`

class DB {
  constructor() {
    this._db = null
  }

  open() {
    if (this._db !== null) {
      throw new Error('Already connected')
    }

    return new Promise((resolve, reject) => {
      this._db = new sqlite3.Database(config.get('db:path'), error => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    }).then(this._createTables.bind(this))
  }

  _createTables() {
    return new Promise((resolve, reject) => {
      const cmds = [RECORDS_SQL, RECORDS_TIMESTAMP_IDX_SQL]
      let i = 0

      const next = () => {
        this._db.run(cmds[i], (error, row) => {
          if (error) {
            reject(error)
          } else if (++i < cmds.length) {
            next()
          } else {
            resolve()
          }
        })
      }

      next()
    })
  }

  close() {
    return new Promise((resolve, reject) => {
      this._db.close(error => {
        if (error) {
          reject(error)
        } else {
          this._db = null
          resolve()
        }
      })
    })
  }

  storeRecord(record) {
    if (record.size === 0) {
      throw new Error('Cannot store an empty record')
    }

    return new Promise((resolve, reject) => {
      const columns = ['timestamp']
      const values = [Math.round(record.timestamp.getTime() / 1000)]

      for (const [name, reading] of record) {
        columns.push('"' + name + '"')
        values.push(reading.value)
      }

      const sql = [
        'INSERT INTO records(',
        columns.join(','),
        ') VALUES(',
        Array(values.length).fill('?').join(', '),
        ');',
      ].join('')

      this._db.run(sql, values, error => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  }

  retrieveRecords(limit = null) {
    return new Promise((resolve, reject) => {
      const sql = ['SELECT * FROM records ORDER BY timestamp ASC']

      if (limit) {
        sql.push(' LIMIT ')
        sql.push(limit)
      }

      sql.push(';')

      this._db.all(sql.join(''), (error, rows) => {
        if (error) {
          reject(error)
        } else {
          resolve(rows)
        }
      })
    })
  }

  deleteRecords(records) {
    return new Promise((resolve, reject) => {
      const sql = ['DELETE FROM records WHERE id IN (']

      for (const r of records) {
        sql.push(r.id)
        sql.push(',')
      }

      sql.push(');')

      this._db.run(sql.join(''), error => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  }

  deleteAllRecords() {
    return new Promise((resolve, reject) => {
      this._db.run('DELETE FROM records;', error => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  }
}

module.exports = DB

const DB = require('./db')
const m2x = require('./m2x')

class Uploader {
  upload(record, uploadPending = true, storeOnError = true) {
    if (!uploadPending && !storeOnError) {
      const values = {}
      this._appendRecord(values, record)
      return m2x.postUpdates({ values })
    }

    const db = new DB()

    return db.open()
      .then(() => {
        if (uploadPending) {
          return db.retrieveAllRecords()
        } else {
          return []
        }
      })
      .then(pendingRecords => {
        const values = {}
        for (const r of pendingRecords) {
          this._appendRow(values, r)
        }
        this._appendRecord(values, record)

        return this._postValues(values, db, record)
      })
      .then(() => {
        return db.close()
      })
      .catch(error => {
        return db.close().then(() => {
          return Promise.reject(error)
        })
      })
  }

  _appendRecord(values, record) {
    for (const [name, reading] of record) {
      if (reading.value === null) {
        continue
      }

      const r = {
        timestamp: record.timestamp.toISOString(),
        value: reading.value,
      }

      if (!values.hasOwnProperty(name)) {
        values[name] = [r]
      } else {
        values[name].push(r)
      }
    }
  }

  _appendRow(values, row) {
    const timestamp = new Date(row.timestamp * 1000).toISOString()

    for (const column in row) {
      if (column === 'id' || column === 'timestamp' || row[column] === null) {
        continue
      }

      const r = {
        timestamp,
        value: row[column],
      }

      if (!values.hasOwnProperty(column)) {
        values[column] = [r]
      } else {
        values[column].push(r)
      }
    }
  }

  _postValues(values, db, record) {
    return new Promise((resolve, reject) => {
      m2x.postUpdates({ values })
        .then(() => {
          return db.deleteAllRecords()
        })
        .then(resolve)
        .catch(error => {
          db.storeRecord(record)
            .then(() => {
              reject(error)
            })
            .catch(reject)
        })
    })
  }
}

module.exports = new Uploader()

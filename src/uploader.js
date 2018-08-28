const config = require('./config')
const Influx = require('influx')

class Uploader {
  constructor() {
    this._influx = new Influx.InfluxDB({
      database: config.get('influxdb:database'),
      host: config.get('influxdb:host'),
      port: config.get('influxdb:port'),
      protocol: config.get('influxdb:protocol'),
      username: config.get('influxdb:username'),
      password: config.get('influxdb:password'),
    })
  }

  async uploadRecord(record) {
    await this._influx.writePoints(this._recordToPoints(record))
  }

  async uploadStoredRecords(db) {
    const maxPointsPerWrite = config.get('influxdb:maxPointsPerWrite')
    let records = await db.retrieveRecords(maxPointsPerWrite)

    while (records.length > 0) {
      await this._influx.writePoints(this._storedRecordsToPoints(records))
      await db.deleteRecords(records)
      records = await db.retrieveRecords(maxPointsPerWrite)
    }
  }

  _recordToPoints(record) {
    const points = []
    const globalTags = config.get('influxdb:tags')

    for (const [name, reading] of record) {
      if (reading.value === null) {
        continue
      }

      const p = {
        timestamp: record.timestamp,
        measurement: reading.type,
        tags: { sensor: reading.sensor },
        fields: { value: reading.value },
      }

      if (globalTags) {
        Object.assign(p.tags, globalTags)
      }

      points.push(p)
    }

    return points
  }

  _storedRecordsToPoints(records) {
    const points = []
    const globalTags = config.get('influxdb:tags')

    for (const r of records) {
      const timestamp = new Date(r.timestamp * 1000)

      for (const column in r) {
        if (column === 'id' || column === 'timestamp' || r[column] === null) {
          continue
        }

        const parts = column.split(/\-(.+)/)
        const sensor = parts[0]
        const type = parts[1]

        const p = {
          timestamp,
          measurement: type,
          tags: { sensor },
          fields: { value: r[column] },
        }

        if (globalTags) {
          Object.assign(p.tags, globalTags)
        }

        points.push(p)
      }
    }

    return points
  }
}

module.exports = Uploader

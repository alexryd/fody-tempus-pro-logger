const colors = require('colors/safe')
const config = require('./config')
const Uploader = require('./uploader')
const WeatherStation = require('./weather-station')

module.exports = async (db, skipStored = false) => {
  try {
    console.log(colors.gray('Scanning for readings...'))

    const record = await WeatherStation.getRecord(
      config.get('sensor:readings'),
      config.get('sensor:readTimeout'),
      config.get('sensor:addresses')
    )

    console.log('Found', colors.green(record.size), 'sensor readings')

    if (record.size > 0) {
      const uploader = new Uploader()

      try {
        await uploader.uploadRecord(record)
        console.log('Sensor readings uploaded')
      } catch (e) {
        console.log('Failed to upload record:', e.message)
        await db.storeRecord(record)
        return
      }

      if (!skipStored) {
        const numUploaded = await uploader.uploadStoredRecords(db)

        if (numUploaded > 0) {
          console.log(numUploaded, 'stored record(s) uploaded')
        }
      }
    }
  } catch (e) {
    console.error(colors.red('An error occurred:'), e)
  }
}

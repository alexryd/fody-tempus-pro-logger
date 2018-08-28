# Fody Tempus Pro logger

Periodically reads sensor readings from a Fody Tempus Pro weather station and posts them to an
[InfluxDB](https://www.influxdata.com/time-series-platform/influxdb/) database.

## Prerequisites
* Raspbian Stretch
* node
* `apt-get install bluetooth bluez libbluetooth-dev libudev-dev`

## Installation
1. Clone this repository:
   `git clone https://github.com/alexryd/fody-tempus-pro-logger.git`.
2. Enter the new directory: `cd fody-tempus-pro-logger`.
3. Install fody-tempus-pro-logger globally: `npm install -g`.
4. Create a new user: `sudo useradd --no-create-home --system fody`.
5. Create a new directory: `sudo mkdir /var/fody`.
6. Create the file `/var/fody/config.json` and add the following content:
   ```
   {
     "influxdb": {
       "database": "your InfluxDB database name",
       "host": "your InfluxDB hostname",
       "username": "your username",
       "password": "your password"
     },

     "db": {
       "path": "/var/fody/data.db"
     }
   }
   ```
7. Make the config directory only accessible to the user:
   `sudo chmod 700 /var/fody`.
8. Change owner of the config directory: `sudo chown -R fody:fody /var/fody`.
9. Create the file `/etc/systemd/system/fody-tempus-pro-logger.service` and add
   the following content:
   ```
   [Unit]
   Description=Fody Tempus Pro logger
   After=syslog.target network-online.target

   [Service]
   Type=simple
   User=fody
   EnvironmentFile=/etc/default/fody-tempus-pro-logger
   ExecStart=/opt/nodejs/bin/fody-tempus-pro-logger $FTPL_OPTS
   Restart=on-failure
   RestartSec=10
   KillMode=process

   [Install]
   WantedBy=multi-user.target
   ```
10. Create the file `/etc/default/fody-tempus-pro-logger` and add the following
    content:
    ```
    FTPL_OPTS=--config='/var/fody/config.json'
    ```
11. Enable and run the fody-tempus-pro-logger service:
    ```
    sudo systemctl daemon-reload
    sudo systemctl enable fody-tempus-pro-logger
    sudo systemctl start fody-tempus-pro-logger
    ```
12. Check the status of the service by running
    `systemctl status fody-tempus-pro-logger` and the logs by running
    `journalctl -u fody-tempus-pro-logger`.

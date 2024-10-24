#!/bin/sh

# Required due to macOS Sonoma 14.4 breaking all other ways of getting the SSID

# WIRELESS_PORT=$(networksetup -listallhardwareports | awk '/Wi-Fi|AirPort/{getline; print $NF}')
# SSID=$(networksetup -getairportnetwork "$WIRELESS_PORT" | cut -d " " -f4)

# Now works in Sequoia

SSID=$(ipconfig getsummary en0 | awk -F ' SSID : '  '/ SSID : / {print $2}')

echo "$SSID"

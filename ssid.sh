#!/bin/sh

# Required due to macOS Sonoma 14.4 breaking all other ways of getting the SSID

# WIRELESS_PORT=$(networksetup -listallhardwareports | awk '/Wi-Fi|AirPort/{getline; print $NF}')
# SSID=$(networksetup -getairportnetwork "$WIRELESS_PORT" | cut -d " " -f4)

# Now works in Sequoia

# system_profiler SPAirPortDataType | awk '/Current Network Information:/ { getline; print substr($0, 13, (length($0) - 13)); exit }'

# /usr/libexec/PlistBuddy -c 'Print :0:_items:0:spairport_airport_interfaces:0:spairport_current_network_information:_name' /dev/stdin <<< "$(system_profiler SPAirPortDataType -xml)" 2> /dev/null

SSID=$(ipconfig getsummary en0 | awk -F ' SSID : '  '/ SSID : / {print $2}')

echo "$SSID"

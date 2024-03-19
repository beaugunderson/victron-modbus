#!/bin/sh

# Required due to macOS Sonoma 14.4 breaking all other ways of getting the SSID

WIRELESS_PORT=$(networksetup -listallhardwareports | awk '/Wi-Fi|AirPort/{getline; print $NF}')

SSID=$(networksetup -getairportnetwork "$WIRELESS_PORT" | cut -d " " -f4)

echo "$SSID"

import AppKit
import CoreLocation
import CoreWLAN
import Foundation

// macOS redacts the current Wi-Fi SSID from callers without a Location Services
// grant, and a grant is only issued to a signed bundle that declares a usage
// string. This helper is that bundle: it holds the grant and prints the SSID.
//
// Run `ssid --authorize` once to grant it. Ordinary runs print the SSID and
// never block, so the SwiftBar refresh cannot wedge on a permission prompt.
//
// Exit codes: 0 SSID on stdout, 1 Wi-Fi off or unassociated, 2 not authorized,
// 3 timed out waiting on the authorization prompt.

private func fail(_ message: String, code: Int32) -> Never {
  FileHandle.standardError.write(Data("ssid: \(message)\n".utf8))
  exit(code)
}

private func describe(_ status: CLAuthorizationStatus) -> String {
  switch status {
  case .notDetermined: return "notDetermined"
  case .restricted: return "restricted"
  case .denied: return "denied"
  case .authorizedAlways: return "authorizedAlways"
  case .authorizedWhenInUse: return "authorizedWhenInUse"
  @unknown default: return "unknown(\(status.rawValue))"
  }
}

// A readable SSID is itself the proof of authorization: CLLocationManager
// reports a stale status until it has synced with locationd, so asking it
// first would send an authorized run down the prompt path.
private func printSSIDAndExit() -> Never {
  guard let interface = CWWiFiClient.shared().interface() else {
    fail("no Wi-Fi interface", code: 1)
  }

  if let ssid = interface.ssid() {
    print(ssid)
    exit(0)
  }

  if !interface.powerOn() {
    fail("Wi-Fi is off", code: 1)
  }

  if interface.activePHYMode() == .modeNone {
    fail("not associated with a network", code: 1)
  }

  fail("SSID redacted; run `ssid --authorize` once to grant Location Services", code: 2)
}

// Presents the authorization prompt. This is the only path that becomes a
// foreground app, so the Dock icon appears for the one-time grant and never
// during an ordinary run.
private final class PromptApp: NSObject, NSApplicationDelegate, CLLocationManagerDelegate {
  private let manager = CLLocationManager()

  func applicationDidFinishLaunching(_ notification: Notification) {
    NSApp.activate(ignoringOtherApps: true)

    manager.delegate = self
    manager.requestWhenInUseAuthorization()
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    switch manager.authorizationStatus {
    case .notDetermined:
      break
    case .authorizedAlways, .authorizedWhenInUse:
      printSSIDAndExit()
    case .denied, .restricted:
      fail("Location Services denied; enable Victron SSID in System Settings > Privacy & Security > Location Services", code: 2)
    @unknown default:
      fail("unknown Location Services authorization status", code: 2)
    }
  }
}

if CommandLine.arguments.contains("--status") {
  let manager = CLLocationManager()

  // Give the manager a moment to sync its status with locationd.
  RunLoop.current.run(until: Date().addingTimeInterval(0.3))

  print("bundle:        \(Bundle.main.bundleIdentifier ?? "none")")
  print("bundle path:   \(Bundle.main.bundlePath)")
  print("services:      \(CLLocationManager.locationServicesEnabled() ? "enabled" : "DISABLED system-wide")")
  print("authorization: \(describe(manager.authorizationStatus))")
  print("ssid:          \(CWWiFiClient.shared().interface()?.ssid() ?? "(redacted or unassociated)")")

  exit(0)
}

if CommandLine.arguments.contains("--authorize") {
  let promptApp = PromptApp()

  DispatchQueue.main.asyncAfter(deadline: .now() + 120) {
    fail("timed out waiting for the Location Services prompt to be answered", code: 3)
  }

  let app = NSApplication.shared

  app.delegate = promptApp

  app.setActivationPolicy(.regular)
  app.run()
}

printSSIDAndExit()

# Black screen follow-up ? 30 October 2026

Owner reports a new whole-display blackout without taking a screenshot. Read-only Windows event inspection found LiveKernelEvent 117 referencing WATCHDOG-20261030-0132.dmp, reported at 01:35:20 and 01:38:11 local time. This is a new distinct dump, while the older October 28/29 filenames repeated in the same report batches are not additional new failures. Kernel-Power 41 at 01:34:53 records an unclean restart; it does not identify the cause.

Microsoft defines 0x117 as a display driver failing to respond in time. This corroborates a graphics timeout, not a diagnosis of the triggering application, driver defect or hardware fault. The user's latest report means screenshotting is not required. Kaya/Chrome rendering remains a possible trigger, not proven or cleared. No dump analysis or faulting-module attribution was performed.

Chrome Local State hardware_acceleration_mode.enabled was true when inspected. Only this setting was printed; no profile contents were exposed. Recommend saving work, opening chrome://settings/system, turning graphics acceleration off, and relaunching Chrome. This is a reversible diagnostic recommended by Google, not a guaranteed fix. Do not deliberately reproduce a whole-display crash. If it recurs with acceleration off, or outside Chrome, escalate to ASUS graphics/Windows diagnostics with the dump filenames.

Sources:
- https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/bug-check-0x117---video-tdr-timeout-detected
- https://support.google.com/chrome/answer/142063?co=genie.platform%3Ddesktop&hl=en

No driver, Chrome setting, OS setting, model runtime or application data changed. Mockup rendering used headless Chromium with --disable-gpu and no application server.

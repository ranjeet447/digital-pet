import AppKit

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem?
    private var petController: PetController?

    func applicationDidFinishLaunching(_ notification: Notification) {
        petController = PetController()
        configureStatusItem()
    }

    func applicationWillTerminate(_ notification: Notification) {
        petController?.stop()
    }

    private func configureStatusItem() {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        if let button = item.button {
            button.image = NSImage(
                systemSymbolName: "pawprint.fill",
                accessibilityDescription: "Shiro"
            )
            button.toolTip = "Shiro"
        }

        let menu = NSMenu()
        menu.addItem(withTitle: "Bring Shiro Here", action: #selector(bringShiroHere), keyEquivalent: "b")
        menu.addItem(withTitle: "Do a Random Trick", action: #selector(doTrick), keyEquivalent: "t")
        menu.addItem(withTitle: "Take a Nap in Corner", action: #selector(takeNap), keyEquivalent: "n")
        menu.addItem(commandMenuItem())
        menu.addItem(sizeMenuItem())
        menu.addItem(.separator())

        let pauseItem = NSMenuItem(title: "Pause Shiro", action: #selector(togglePause(_:)), keyEquivalent: "p")
        pauseItem.target = self
        menu.addItem(pauseItem)

        let mischiefItem = NSMenuItem(
            title: "Cursor Mischief",
            action: #selector(toggleCursorMischief(_:)),
            keyEquivalent: ""
        )
        mischiefItem.target = self
        mischiefItem.state = .off
        menu.addItem(mischiefItem)

        menu.addItem(.separator())
        menu.addItem(withTitle: "Quit Shiro", action: #selector(quit), keyEquivalent: "q")

        for menuItem in menu.items where menuItem.target == nil {
            menuItem.target = self
        }

        item.menu = menu
        statusItem = item
    }

    private func commandMenuItem() -> NSMenuItem {
        let rootItem = NSMenuItem(title: "All Tricks & Commands", action: nil, keyEquivalent: "")
        let submenu = NSMenu(title: "All Tricks & Commands")

        for command in PetCommand.allCases {
            let item = NSMenuItem(
                title: command.title,
                action: #selector(runCommand(_:)),
                keyEquivalent: ""
            )
            item.target = self
            item.representedObject = command.rawValue
            submenu.addItem(item)

            if command == .run || command == .sleep || command == .quiet {
                submenu.addItem(.separator())
            }
        }

        rootItem.submenu = submenu
        return rootItem
    }

    private func sizeMenuItem() -> NSMenuItem {
        let rootItem = NSMenuItem(title: "Size", action: nil, keyEquivalent: "")
        let submenu = NSMenu(title: "Size")
        let labels: [(String, CGFloat)] = [
            ("Small (75%)", 0.75),
            ("Normal (100%)", 1.0),
            ("Large (125%)", 1.25),
            ("Extra Large (150%)", 1.5)
        ]

        for (title, scale) in labels {
            let item = NSMenuItem(title: title, action: #selector(changeSize(_:)), keyEquivalent: "")
            item.target = self
            item.representedObject = NSNumber(value: Double(scale))
            item.state = petController?.sizeScale == scale ? .on : .off
            submenu.addItem(item)
        }

        rootItem.submenu = submenu
        return rootItem
    }

    @objc private func bringShiroHere() {
        petController?.bringToCursor()
    }

    @objc private func doTrick() {
        petController?.performTrick()
    }

    @objc private func takeNap() {
        petController?.takeNap()
    }

    @objc private func runCommand(_ sender: NSMenuItem) {
        guard
            let rawValue = sender.representedObject as? String,
            let command = PetCommand(rawValue: rawValue)
        else { return }
        petController?.perform(command)
    }

    @objc private func changeSize(_ sender: NSMenuItem) {
        guard
            let number = sender.representedObject as? NSNumber,
            let submenu = sender.menu
        else { return }

        let scale = CGFloat(number.doubleValue)
        petController?.setSizeScale(scale)
        for item in submenu.items {
            item.state = item === sender ? .on : .off
        }
    }

    @objc private func togglePause(_ sender: NSMenuItem) {
        guard let petController else { return }
        petController.isPaused.toggle()
        sender.title = petController.isPaused ? "Resume Shiro" : "Pause Shiro"
    }

    @objc private func toggleCursorMischief(_ sender: NSMenuItem) {
        guard let petController else { return }
        let enabled = !petController.cursorMischiefEnabled
        petController.setCursorMischief(enabled)
        sender.state = enabled ? .on : .off
    }

    @objc private func quit() {
        NSApplication.shared.terminate(nil)
    }
}

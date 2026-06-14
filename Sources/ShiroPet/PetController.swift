import AppKit
import ApplicationServices

enum PetCommand: String, CaseIterable {
    case sit
    case walk
    case run
    case jump
    case down
    case sleep
    case rollOver
    case handshake
    case highFive
    case salute
    case namaste
    case speak
    case quiet
    case fetch

    var title: String {
        switch self {
        case .sit: return "Sit"
        case .walk: return "Walk"
        case .run: return "Run"
        case .jump: return "Jump"
        case .down: return "Down"
        case .sleep: return "Sleep"
        case .rollOver: return "Roll Over"
        case .handshake: return "Handshake"
        case .highFive: return "Hi-Five"
        case .salute: return "Salute"
        case .namaste: return "Namaste"
        case .speak: return "Speak"
        case .quiet: return "Quiet"
        case .fetch: return "Fetch a Ball"
        }
    }
}

enum PetTrick: CaseIterable, Equatable {
    case sit
    case jump
    case down
    case rollOver
    case handshake
    case highFive
    case salute
    case namaste
    case speak
    case fetch

    var message: String {
        switch self {
        case .sit: return "Good sit!"
        case .jump: return "Jump!"
        case .down: return "Down!"
        case .rollOver: return "Roll over!"
        case .handshake: return "Shake!"
        case .highFive: return "Hi-five!"
        case .salute: return "Salute!"
        case .namaste: return "Namaste!"
        case .speak: return "WOOF!"
        case .fetch: return "BALL!"
        }
    }

    var duration: TimeInterval {
        switch self {
        case .sit: return 2.8
        case .jump: return 1.8
        case .down: return 2.8
        case .rollOver: return 2.2
        case .handshake, .highFive: return 2.4
        case .salute, .namaste: return 2.5
        case .speak: return 1.8
        case .fetch: return 3.4
        }
    }
}

enum PetBehavior: Equatable {
    case idle
    case walking
    case running
    case chasing
    case napping
    case trick(PetTrick)
}

final class PetPanel: NSPanel {
    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}

final class PetController {
    static let basePetSize = NSSize(width: 210, height: 170)
    static let sizeDefaultsKey = "ShiroPet.sizeScale"
    static let supportedScales: [CGFloat] = [0.75, 1.0, 1.25, 1.5]

    private let panel: PetPanel
    private let petView: PetView
    private var timer: Timer?
    private var lastTick = ProcessInfo.processInfo.systemUptime
    private var nextDecisionAt = ProcessInfo.processInfo.systemUptime + 5
    private var behaviorEndsAt: TimeInterval?
    private var walkingTargetX: CGFloat?
    private var lastCursorNudgeAt: TimeInterval = 0
    private var lastCursorPosition = NSEvent.mouseLocation
    private var cursorStillSince = ProcessInfo.processInfo.systemUptime
    private(set) var sizeScale: CGFloat

    var isPaused = false {
        didSet {
            petView.isPaused = isPaused
            if isPaused {
                setBehavior(.idle)
            } else {
                scheduleNextDecision(in: 2)
            }
        }
    }

    private(set) var cursorMischiefEnabled = false

    init() {
        let savedScale = UserDefaults.standard.double(forKey: Self.sizeDefaultsKey)
        sizeScale = Self.supportedScales.contains(CGFloat(savedScale)) ? CGFloat(savedScale) : 1
        let size = Self.scaledSize(for: sizeScale)
        let startFrame = NSRect(origin: .zero, size: size)

        panel = PetPanel(
            contentRect: startFrame,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        petView = PetView(frame: startFrame)

        configurePanel()
        placeAtBottomRight()
        panel.orderFrontRegardless()
        startTimer()
    }

    func stop() {
        timer?.invalidate()
        timer = nil
    }

    func bringToCursor() {
        guard let screen = screen(containing: NSEvent.mouseLocation) else { return }
        let visible = screen.visibleFrame
        let cursor = NSEvent.mouseLocation
        let origin = NSPoint(
            x: min(max(cursor.x - panel.frame.width / 2, visible.minX), visible.maxX - panel.frame.width),
            y: min(max(cursor.y - 36, visible.minY), visible.maxY - panel.frame.height)
        )
        panel.setFrameOrigin(origin)
        panel.orderFrontRegardless()
        setBehavior(.idle)
        petView.showMessage("Hi!")
        scheduleNextDecision(in: 3)
    }

    func performTrick() {
        guard !isPaused else { return }
        let trick = PetTrick.allCases.randomElement() ?? .jump
        perform(trick)
    }

    func perform(_ command: PetCommand) {
        guard !isPaused || command == .quiet else { return }

        switch command {
        case .walk:
            startMoving(running: false)
            petView.showMessage("Walk!")
        case .run:
            startMoving(running: true)
            petView.showMessage("Run!")
        case .sleep:
            takeNap()
        case .quiet:
            behaviorEndsAt = nil
            setBehavior(.idle)
            scheduleNextDecision(in: 8)
            petView.showMessage("...")
        case .sit:
            perform(PetTrick.sit)
        case .jump:
            perform(PetTrick.jump)
        case .down:
            perform(PetTrick.down)
        case .rollOver:
            perform(PetTrick.rollOver)
        case .handshake:
            perform(PetTrick.handshake)
        case .highFive:
            perform(PetTrick.highFive)
        case .salute:
            perform(PetTrick.salute)
        case .namaste:
            perform(PetTrick.namaste)
        case .speak:
            perform(PetTrick.speak)
        case .fetch:
            perform(PetTrick.fetch)
        }
    }

    func takeNap() {
        guard !isPaused else { return }
        moveToNearestCorner()
        setBehavior(.napping)
        nextDecisionAt = .greatestFiniteMagnitude
        petView.showMessage("Zzz...")
    }

    func setCursorMischief(_ enabled: Bool) {
        cursorMischiefEnabled = enabled
        guard enabled else { return }

        let promptKey = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
        let options = [promptKey: true] as CFDictionary
        _ = AXIsProcessTrustedWithOptions(options)
        petView.showMessage("Mischief on!")
    }

    func setSizeScale(_ scale: CGFloat) {
        guard Self.supportedScales.contains(scale), scale != sizeScale else { return }
        let oldFrame = panel.frame
        sizeScale = scale
        UserDefaults.standard.set(Double(scale), forKey: Self.sizeDefaultsKey)

        let newSize = Self.scaledSize(for: scale)
        var origin = NSPoint(x: oldFrame.midX - newSize.width / 2, y: oldFrame.minY)
        if let screen = screen(containing: oldFrame.center) ?? NSScreen.main {
            let visible = screen.visibleFrame
            origin.x = min(max(origin.x, visible.minX), visible.maxX - newSize.width)
            origin.y = min(max(origin.y, visible.minY), visible.maxY - newSize.height)
        }
        panel.setFrame(NSRect(origin: origin, size: newSize), display: true, animate: true)
        petView.showMessage("\(Int(scale * 100))%")
    }

    private func configurePanel() {
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = false
        panel.level = .statusBar
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        panel.hidesOnDeactivate = false
        panel.isMovableByWindowBackground = false
        panel.contentView = petView

        petView.onClick = { [weak self] in
            self?.performTrick()
        }
        petView.onDrag = { [weak self] delta in
            self?.drag(by: delta)
        }
    }

    private func placeAtBottomRight() {
        guard let screen = NSScreen.main else { return }
        let visible = screen.visibleFrame
        panel.setFrameOrigin(
            NSPoint(
                x: visible.maxX - panel.frame.width - 24,
                y: visible.minY + 14
            )
        )
    }

    private func startTimer() {
        let timer = Timer(timeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in
            self?.tick()
        }
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }

    private func tick() {
        let now = ProcessInfo.processInfo.systemUptime
        let deltaTime = min(now - lastTick, 0.1)
        lastTick = now
        petView.animationTime = now

        guard !isPaused else {
            petView.needsDisplay = true
            return
        }

        trackCursor(now: now)
        updateBehavior(now: now, deltaTime: deltaTime)
        petView.needsDisplay = true
    }

    private func trackCursor(now: TimeInterval) {
        let cursor = NSEvent.mouseLocation
        let movement = hypot(cursor.x - lastCursorPosition.x, cursor.y - lastCursorPosition.y)
        if movement > 3 {
            lastCursorPosition = cursor
            cursorStillSince = now
        }

        let petCenter = NSPoint(x: panel.frame.midX, y: panel.frame.midY)
        let distance = hypot(cursor.x - petCenter.x, cursor.y - petCenter.y)

        if distance < 220, !petView.isNapping, !petView.isDoingTrick {
            petView.lookDirection = cursor.x < petCenter.x ? -1 : 1
            if now - cursorStillSince < 0.7, distance > 75 {
                setBehavior(.chasing)
            } else if petView.behavior == .chasing {
                setBehavior(.idle)
            }
        } else if petView.behavior == .chasing {
            setBehavior(.idle)
        }

        if cursorMischiefEnabled,
           distance < 120,
           now - lastCursorNudgeAt > 15,
           !petView.isNapping {
            nudgeCursorAway(from: petCenter, cursor: cursor)
            lastCursorNudgeAt = now
            petView.showMessage("Boop!")
        }
    }

    private func updateBehavior(now: TimeInterval, deltaTime: TimeInterval) {
        if let behaviorEndsAt, now >= behaviorEndsAt {
            self.behaviorEndsAt = nil
            setBehavior(.idle)
            scheduleNextDecision(in: Double.random(in: 3...7))
        }

        switch petView.behavior {
        case .walking:
            updateWalking(deltaTime: deltaTime, speed: 58)
        case .running:
            updateWalking(deltaTime: deltaTime, speed: 128)
        case .chasing:
            updateChasing(deltaTime: deltaTime)
        case .idle, .napping, .trick:
            break
        }

        if now >= nextDecisionAt, behaviorEndsAt == nil, petView.behavior != .chasing {
            chooseNextBehavior()
        }
    }

    private func updateWalking(deltaTime: TimeInterval, speed: CGFloat) {
        guard let targetX = walkingTargetX else {
            setBehavior(.idle)
            return
        }

        let difference = targetX - panel.frame.origin.x
        if abs(difference) < 3 {
            panel.setFrameOrigin(NSPoint(x: targetX, y: panel.frame.origin.y))
            walkingTargetX = nil
            setBehavior(.idle)
            scheduleNextDecision(in: Double.random(in: 3...7))
            return
        }

        let direction: CGFloat = difference < 0 ? -1 : 1
        petView.lookDirection = direction
        moveHorizontally(by: direction * speed * deltaTime)
    }

    private func updateChasing(deltaTime: TimeInterval) {
        let cursor = NSEvent.mouseLocation
        guard let screen = screen(containing: panel.frame.center) else { return }
        let visible = screen.visibleFrame
        let desiredX = min(
            max(cursor.x - panel.frame.width / 2, visible.minX),
            visible.maxX - panel.frame.width
        )
        let difference = desiredX - panel.frame.origin.x
        guard abs(difference) > 55 else { return }

        let direction: CGFloat = difference < 0 ? -1 : 1
        petView.lookDirection = direction
        moveHorizontally(by: direction * 85 * deltaTime)
    }

    private func chooseNextBehavior() {
        let roll = Int.random(in: 0..<100)
        if roll < 38 {
            startMoving(running: false)
        } else if roll < 52 {
            startMoving(running: true)
        } else if roll < 70 {
            setBehavior(.idle, duration: Double.random(in: 4...9))
        } else if roll < 85 {
            performTrick()
        } else if roll < 91 {
            perform(PetTrick.fetch)
        } else {
            takeShortNap()
        }
    }

    private func startMoving(running: Bool) {
        guard let screen = screen(containing: panel.frame.center) ?? NSScreen.main else { return }
        let visible = screen.visibleFrame
        walkingTargetX = CGFloat.random(
            in: visible.minX...(visible.maxX - panel.frame.width)
        )
        setBehavior(running ? .running : .walking)
        nextDecisionAt = .greatestFiniteMagnitude
    }

    private func moveToNearestCorner() {
        guard let screen = screen(containing: panel.frame.center) ?? NSScreen.main else { return }
        let visible = screen.visibleFrame
        let leftX = visible.minX + 12
        let rightX = visible.maxX - panel.frame.width - 12
        let x = abs(panel.frame.minX - leftX) < abs(panel.frame.minX - rightX) ? leftX : rightX
        panel.setFrameOrigin(NSPoint(x: x, y: visible.minY + 8))
    }

    private func takeShortNap() {
        moveToNearestCorner()
        setBehavior(.napping, duration: Double.random(in: 12...24))
        petView.showMessage("Zzz...")
    }

    private func setBehavior(_ behavior: PetBehavior, duration: TimeInterval? = nil) {
        petView.behavior = behavior
        behaviorEndsAt = duration.map { ProcessInfo.processInfo.systemUptime + $0 }
        if behavior != .walking, behavior != .running {
            walkingTargetX = nil
        }
    }

    private func perform(_ trick: PetTrick) {
        guard !isPaused else { return }
        if trick == .fetch {
            petView.chooseNewBall()
        }
        setBehavior(.trick(trick), duration: trick.duration)
        petView.showMessage(trick.message)
    }

    private static func scaledSize(for scale: CGFloat) -> NSSize {
        NSSize(width: basePetSize.width * scale, height: basePetSize.height * scale)
    }

    private func scheduleNextDecision(in delay: TimeInterval) {
        nextDecisionAt = ProcessInfo.processInfo.systemUptime + delay
    }

    private func moveHorizontally(by distance: CGFloat) {
        guard let screen = screen(containing: panel.frame.center) ?? NSScreen.main else { return }
        let visible = screen.visibleFrame
        let x = min(
            max(panel.frame.origin.x + distance, visible.minX),
            visible.maxX - panel.frame.width
        )
        panel.setFrameOrigin(NSPoint(x: x, y: panel.frame.origin.y))
    }

    private func drag(by delta: NSPoint) {
        var origin = panel.frame.origin
        origin.x += delta.x
        origin.y += delta.y

        if let screen = screen(containing: NSPoint(x: panel.frame.midX + delta.x, y: panel.frame.midY + delta.y)) {
            let visible = screen.visibleFrame
            origin.x = min(max(origin.x, visible.minX), visible.maxX - panel.frame.width)
            origin.y = min(max(origin.y, visible.minY), visible.maxY - panel.frame.height)
        }

        panel.setFrameOrigin(origin)
        setBehavior(.idle)
        scheduleNextDecision(in: 4)
    }

    private func nudgeCursorAway(from pet: NSPoint, cursor: NSPoint) {
        var dx = cursor.x - pet.x
        var dy = cursor.y - pet.y
        let length = max(hypot(dx, dy), 1)
        dx /= length
        dy /= length

        let target = CGPoint(x: cursor.x + dx * 22, y: cursor.y + dy * 22)
        CGWarpMouseCursorPosition(target)
    }

    private func screen(containing point: NSPoint) -> NSScreen? {
        NSScreen.screens.first { $0.frame.contains(point) }
    }
}

private extension NSRect {
    var center: NSPoint {
        NSPoint(x: midX, y: midY)
    }
}

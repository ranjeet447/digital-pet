import AppKit

final class PetView: NSView {
    private static let canvasSize = NSSize(width: 210, height: 170)
    private static let ballColors: [NSColor] = [
        NSColor(calibratedRed: 0.93, green: 0.24, blue: 0.20, alpha: 1),
        NSColor(calibratedRed: 0.16, green: 0.55, blue: 0.92, alpha: 1),
        NSColor(calibratedRed: 0.96, green: 0.72, blue: 0.13, alpha: 1),
        NSColor(calibratedRed: 0.38, green: 0.74, blue: 0.32, alpha: 1),
        NSColor(calibratedRed: 0.64, green: 0.35, blue: 0.86, alpha: 1)
    ]

    private let golden = NSColor(calibratedRed: 0.82, green: 0.48, blue: 0.17, alpha: 1)
    private let lightGolden = NSColor(calibratedRed: 0.96, green: 0.70, blue: 0.31, alpha: 1)
    private let cream = NSColor(calibratedRed: 0.98, green: 0.82, blue: 0.48, alpha: 1)
    private let darkGolden = NSColor(calibratedRed: 0.55, green: 0.27, blue: 0.08, alpha: 1)
    private let deepGolden = NSColor(calibratedRed: 0.43, green: 0.21, blue: 0.07, alpha: 1)
    private let highlightGolden = NSColor(calibratedRed: 1, green: 0.85, blue: 0.54, alpha: 1)
    private let tongue = NSColor(calibratedRed: 0.94, green: 0.38, blue: 0.48, alpha: 1)

    var behavior: PetBehavior = .idle {
        didSet {
            if oldValue != behavior {
                behaviorStartedAt = ProcessInfo.processInfo.systemUptime
            }
        }
    }
    var animationTime: TimeInterval = 0
    var lookDirection: CGFloat = -1
    var isPaused = false
    var onClick: (() -> Void)?
    var onDrag: ((NSPoint) -> Void)?

    private var mouseDownScreenPoint: NSPoint?
    private var didDrag = false
    private var message: String?
    private var messageExpiresAt: TimeInterval = 0
    private var behaviorStartedAt = ProcessInfo.processInfo.systemUptime
    private var selectedBallIndex = 0
    private var renderedLookDirection: CGFloat = -1
    private var renderedBodyBounce: CGFloat = 0

    var isNapping: Bool {
        behavior == .napping
    }

    var isDoingTrick: Bool {
        if case .trick = behavior {
            return true
        }
        return false
    }

    override var isFlipped: Bool { false }

    func advance(deltaTime: TimeInterval) {
        let directionFactor = 1 - exp(-12 * deltaTime)
        let bounceFactor = 1 - exp(-16 * deltaTime)
        renderedLookDirection += (lookDirection - renderedLookDirection) * directionFactor
        renderedBodyBounce += (bodyBounce - renderedBodyBounce) * bounceFactor
    }

    override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)
        guard let context = NSGraphicsContext.current?.cgContext else { return }

        let scaleX = bounds.width / Self.canvasSize.width
        let scaleY = bounds.height / Self.canvasSize.height
        context.saveGState()
        context.scaleBy(x: scaleX, y: scaleY)

        drawBallsAtRest()

        context.saveGState()
        context.translateBy(x: Self.canvasSize.width / 2, y: 10 + renderedBodyBounce)
        context.scaleBy(x: renderedLookDirection, y: 1)
        context.translateBy(x: -Self.canvasSize.width / 2, y: 0)
        context.translateBy(x: 105, y: 60)
        context.rotate(by: bodyLean)
        context.translateBy(x: -105, y: -60)
        applyTrickTransform(to: context)

        drawShadow()
        switch behavior {
        case .napping:
            drawLyingShiro(asleep: true)
        case .trick(.down):
            drawLyingShiro(asleep: false)
        case .trick(.rollOver):
            drawRollingShiro()
        case .trick(let trick) where [.sit, .handshake, .highFive, .salute, .namaste].contains(trick):
            drawSittingShiro(pose: trick)
        default:
            drawStandingShiro()
        }

        if behavior == .trick(.fetch) {
            drawFetchBall()
        }
        context.restoreGState()

        drawMessage()
        context.restoreGState()
    }

    override func mouseDown(with event: NSEvent) {
        mouseDownScreenPoint = NSEvent.mouseLocation
        didDrag = false
    }

    override func mouseDragged(with event: NSEvent) {
        let current = NSEvent.mouseLocation
        guard let previous = mouseDownScreenPoint else { return }
        let delta = NSPoint(x: current.x - previous.x, y: current.y - previous.y)
        if abs(delta.x) > 0.5 || abs(delta.y) > 0.5 {
            didDrag = true
            onDrag?(delta)
            mouseDownScreenPoint = current
        }
    }

    override func mouseUp(with event: NSEvent) {
        if !didDrag {
            onClick?()
        }
        mouseDownScreenPoint = nil
    }

    func showMessage(_ text: String) {
        message = text
        messageExpiresAt = ProcessInfo.processInfo.systemUptime + 2.1
        needsDisplay = true
    }

    func chooseNewBall() {
        selectedBallIndex = Int.random(in: 0..<Self.ballColors.count)
    }

    private var bodyBounce: CGFloat {
        guard !isPaused else { return 0 }
        switch behavior {
        case .walking:
            return abs(sin(animationTime * 8)) * 4
        case .running, .chasing:
            return abs(sin(animationTime * 14)) * 7
        case .trick(let trick):
            switch trick {
            case .jump:
                return abs(sin(trickProgress * .pi)) * 30
            case .rollOver:
                return 10
            case .fetch:
                return abs(sin(trickProgress * .pi * 3)) * 4
            case .sit, .down, .handshake, .highFive, .salute, .namaste, .speak:
                return 0
            }
        case .idle:
            return sin(animationTime * 2) * 1.2
        case .napping:
            return sin(animationTime * 1.5) * 0.8
        }
    }

    private var wagAngle: CGFloat {
        guard !isPaused else { return 0 }
        let speed: Double
        switch behavior {
        case .walking: speed = 12
        case .running, .chasing: speed = 19
        case .trick(.fetch): speed = 24
        case .trick: speed = 15
        case .idle: speed = 5
        case .napping: speed = 1
        }
        return sin(animationTime * speed) * 0.42
    }

    private var bodyLean: CGFloat {
        guard !isPaused else { return 0 }
        switch behavior {
        case .walking:
            return sin(animationTime * 8) * 0.018
        case .running, .chasing:
            return -0.045 + sin(animationTime * 14) * 0.024
        case .trick(.jump):
            return sin(trickProgress * .pi * 2) * 0.04
        case .idle:
            return sin(animationTime * 1.4) * 0.006
        case .napping, .trick:
            return 0
        }
    }

    private func drawStandingShiro() {
        let legOffset = legAnimationOffset
        let jumpTuck = behavior == .trick(.jump) ? sin(trickProgress * .pi) * 12 : 0

        drawPlumeTail(anchor: NSPoint(x: 48, y: 73), resting: false)
        drawFeatheredLeg(x: 53, y: 27 - legOffset * 0.72 + jumpTuck, behind: true)
        drawFeatheredLeg(x: 106, y: 27 + legOffset * 0.72 + jumpTuck, behind: true)
        fillGradientEllipse(
            NSRect(x: 43, y: 46, width: 112, height: 66),
            colors: [deepGolden, golden, lightGolden]
        )
        fillEllipse(NSRect(x: 60, y: 51, width: 78, height: 51), color: lightGolden.withAlphaComponent(0.38))
        fillEllipse(NSRect(x: 52, y: 80, width: 92, height: 27), color: deepGolden.withAlphaComponent(0.18))
        fillEllipse(NSRect(x: 102, y: 54, width: 45, height: 48), color: highlightGolden.withAlphaComponent(0.16))
        drawBodyFur()

        drawFeatheredLeg(x: 62, y: 24 + legOffset + jumpTuck)
        drawFeatheredLeg(x: 118, y: 24 - legOffset + jumpTuck)

        drawChestRuff(center: NSPoint(x: 136, y: 75))
        drawHead(origin: NSPoint(x: 121, y: 70), mouthOpen: mouthIsOpen)

        if behavior == .trick(.speak) {
            drawSoundLines()
        }
    }

    private func drawLyingShiro(asleep: Bool) {
        fillGradientEllipse(
            NSRect(x: 36, y: 31, width: 128, height: 67),
            colors: [deepGolden, golden, lightGolden]
        )
        fillEllipse(NSRect(x: 53, y: 39, width: 92, height: 48), color: lightGolden.withAlphaComponent(0.38))
        drawPlumeTail(anchor: NSPoint(x: 52, y: 63), resting: true)
        drawFurTufts(
            from: NSPoint(x: 60, y: 40),
            to: NSPoint(x: 129, y: 43),
            count: 8,
            color: cream.withAlphaComponent(0.75)
        )

        fillRoundedRect(NSRect(x: 72, y: 26, width: 69, height: 23), radius: 11, color: lightGolden)
        drawHead(origin: NSPoint(x: 122, y: 35), mouthOpen: false, eyesClosed: asleep, compact: true)

        if asleep {
            let zOffset = CGFloat((animationTime * 8).truncatingRemainder(dividingBy: 10))
            drawText("z", at: NSPoint(x: 168, y: 96 + zOffset), size: 15, color: .white.withAlphaComponent(0.82))
            drawText("Z", at: NSPoint(x: 184, y: 113 + zOffset), size: 20, color: .white.withAlphaComponent(0.92))
        }
    }

    private func drawRollingShiro() {
        let onBack = sin(trickProgress * .pi)
        let sideDirection = sin(trickProgress * .pi * 2)

        guard let context = NSGraphicsContext.current?.cgContext else { return }
        context.saveGState()
        context.translateBy(x: 105, y: 60)
        context.rotate(by: sideDirection * 0.17)
        context.scaleBy(x: 1, y: 1 - abs(sideDirection) * 0.22)
        context.translateBy(x: -105, y: -60)

        fillGradientEllipse(
            NSRect(x: 35, y: 31, width: 130, height: 68),
            colors: [deepGolden, golden, lightGolden]
        )
        fillEllipse(
            NSRect(x: 53, y: 40, width: 93, height: 48),
            color: lightGolden.withAlphaComponent(0.42)
        )
        drawPlumeTail(anchor: NSPoint(x: 52, y: 64), resting: true)
        drawFurTufts(
            from: NSPoint(x: 60, y: 42),
            to: NSPoint(x: 130, y: 45),
            count: 8,
            color: cream.withAlphaComponent(0.72)
        )

        if onBack > 0.48 {
            let pawLift = (onBack - 0.48) * 22
            drawRaisedPaw(
                from: NSPoint(x: 77, y: 64),
                to: NSPoint(x: 73, y: 84 + pawLift),
                vertical: true
            )
            drawRaisedPaw(
                from: NSPoint(x: 109, y: 66),
                to: NSPoint(x: 116, y: 86 + pawLift),
                vertical: true
            )
            fillEllipse(
                NSRect(x: 76, y: 48, width: 50, height: 33),
                color: cream.withAlphaComponent(0.5)
            )
            drawHead(origin: NSPoint(x: 125, y: 36), mouthOpen: true, compact: true)
        } else {
            fillRoundedRect(NSRect(x: 73, y: 27, width: 70, height: 24), radius: 12, color: lightGolden)
            drawHead(origin: NSPoint(x: 123, y: 35), mouthOpen: false, compact: true)
        }
        context.restoreGState()
    }

    private func drawSittingShiro(pose: PetTrick) {
        drawPlumeTail(anchor: NSPoint(x: 60, y: 61), resting: true)

        fillGradientEllipse(
            NSRect(x: 55, y: 26, width: 93, height: 82),
            colors: [deepGolden, golden, lightGolden]
        )
        fillEllipse(NSRect(x: 68, y: 31, width: 59, height: 63), color: lightGolden.withAlphaComponent(0.38))
        fillEllipse(NSRect(x: 46, y: 20, width: 47, height: 32), color: golden)
        drawBodyFur()
        drawChestRuff(center: NSPoint(x: 134, y: 77))

        switch pose {
        case .handshake:
            drawFeatheredLeg(x: 112, y: 20)
            drawRaisedPaw(from: NSPoint(x: 90, y: 70), to: NSPoint(x: 159, y: 58), vertical: false)
        case .highFive:
            drawFeatheredLeg(x: 103, y: 20)
            drawRaisedPaw(from: NSPoint(x: 93, y: 70), to: NSPoint(x: 157, y: 119), vertical: true)
        case .salute:
            drawFeatheredLeg(x: 109, y: 20)
            drawRaisedPaw(from: NSPoint(x: 94, y: 70), to: NSPoint(x: 153, y: 119), vertical: false)
        case .namaste:
            drawNamastePaws()
        default:
            drawFeatheredLeg(x: 83, y: 19)
            drawFeatheredLeg(x: 119, y: 19)
        }

        drawHead(origin: NSPoint(x: 119, y: 73), mouthOpen: true)
    }

    private func drawHead(
        origin: NSPoint,
        mouthOpen: Bool,
        eyesClosed: Bool = false,
        compact: Bool = false
    ) {
        let width: CGFloat = compact ? 61 : 67
        let height: CGFloat = compact ? 54 : 68
        fillGradientEllipse(
            NSRect(x: origin.x, y: origin.y, width: width, height: height),
            colors: [deepGolden, golden, highlightGolden]
        )

        drawEar(x: origin.x + 7, y: origin.y + 19, mirrored: false, compact: compact)
        drawEar(x: origin.x + width - 9, y: origin.y + 19, mirrored: true, compact: compact)

        let muzzleY = origin.y + (compact ? 2 : 1)
        fillGradientEllipse(
            NSRect(x: origin.x + 24, y: muzzleY, width: compact ? 42 : 47, height: compact ? 31 : 35),
            colors: [
                NSColor(calibratedRed: 0.79, green: 0.48, blue: 0.20, alpha: 1),
                cream,
                NSColor(calibratedRed: 1, green: 0.89, blue: 0.63, alpha: 1)
            ]
        )
        fillGradientEllipse(
            NSRect(x: origin.x + width - 10, y: origin.y + 15, width: 17, height: 13),
            colors: [
                NSColor(calibratedWhite: 0.02, alpha: 1),
                NSColor(calibratedWhite: 0.08, alpha: 1),
                NSColor(calibratedWhite: 0.28, alpha: 1)
            ]
        )
        fillEllipse(
            NSRect(x: origin.x + width - 7, y: origin.y + 22, width: 5, height: 3),
            color: .white.withAlphaComponent(0.35)
        )

        if eyesClosed {
            drawClosedEye(x: origin.x + 32, y: origin.y + height - 24)
            drawClosedEye(x: origin.x + 53, y: origin.y + height - 25)
        } else {
            drawEye(x: origin.x + 31, y: origin.y + height - 26)
            drawEye(x: origin.x + 53, y: origin.y + height - 27)
        }

        if mouthOpen {
            fillEllipse(
                NSRect(x: origin.x + 42, y: origin.y - 3, width: 24, height: 18),
                color: NSColor(calibratedWhite: 0.08, alpha: 1)
            )
            fillRoundedRect(
                NSRect(x: origin.x + 48, y: origin.y - 13, width: 14, height: 24),
                radius: 7,
                color: tongue
            )
            strokePath(
                points: [
                    CGPoint(x: origin.x + 55, y: origin.y - 11),
                    CGPoint(x: origin.x + 55, y: origin.y + 7)
                ],
                color: NSColor(calibratedRed: 0.62, green: 0.19, blue: 0.29, alpha: 0.65),
                width: 1,
                lineCap: .round
            )
        } else {
            strokePath(
                points: [
                    CGPoint(x: origin.x + 43, y: origin.y + 8),
                    CGPoint(x: origin.x + 50, y: origin.y + 5),
                    CGPoint(x: origin.x + 57, y: origin.y + 8)
                ],
                color: NSColor(calibratedWhite: 0.12, alpha: 1),
                width: 2,
                lineCap: .round
            )
        }

        drawEarFeathering(origin: origin, width: width)
        drawFaceDetails(origin: origin, width: width, height: height, compact: compact)
        drawCollar(x: origin.x + 11, y: origin.y + 7, width: width - 12)
    }

    private var mouthIsOpen: Bool {
        switch behavior {
        case .chasing, .running, .trick(.jump), .trick(.speak), .trick(.fetch):
            return true
        default:
            return false
        }
    }

    private func drawPlumeTail(anchor: NSPoint, resting: Bool) {
        NSGraphicsContext.current?.cgContext.saveGState()
        NSGraphicsContext.current?.cgContext.translateBy(x: anchor.x, y: anchor.y)
        NSGraphicsContext.current?.cgContext.rotate(by: (resting ? -0.55 : 0) + wagAngle)

        let points = resting
            ? [CGPoint(x: 0, y: 0), CGPoint(x: -21, y: 10), CGPoint(x: -35, y: 5)]
            : [CGPoint(x: 0, y: 0), CGPoint(x: -14, y: 19), CGPoint(x: -17, y: 39), CGPoint(x: -5, y: 50)]
        strokePath(points: points, color: darkGolden, width: 19, lineCap: .round)
        strokePath(points: points, color: golden, width: 14, lineCap: .round)

        for offset in stride(from: CGFloat(-7), through: 7, by: 3.5) {
            let featherPoints = points.map { CGPoint(x: $0.x + offset, y: $0.y) }
            strokePath(
                points: featherPoints,
                color: cream.withAlphaComponent(0.42),
                width: 1.3,
                lineCap: .round
            )
        }
        NSGraphicsContext.current?.cgContext.restoreGState()
    }

    private func drawChestRuff(center: NSPoint) {
        let tufts: [NSPoint] = [
            NSPoint(x: center.x - 10, y: center.y + 13),
            NSPoint(x: center.x - 5, y: center.y + 5),
            NSPoint(x: center.x, y: center.y),
            NSPoint(x: center.x + 6, y: center.y + 5),
            NSPoint(x: center.x + 11, y: center.y + 14)
        ]
        for (index, point) in tufts.enumerated() {
            fillEllipse(
                NSRect(x: point.x, y: point.y, width: 20, height: 34 - CGFloat(index % 2) * 4),
                color: lightGolden.withAlphaComponent(0.86)
            )
        }
        drawFurTufts(
            from: NSPoint(x: center.x - 5, y: center.y + 5),
            to: NSPoint(x: center.x + 18, y: center.y + 19),
            count: 6,
            color: cream.withAlphaComponent(0.85)
        )
    }

    private func drawBodyFur() {
        drawFurTufts(
            from: NSPoint(x: 58, y: 55),
            to: NSPoint(x: 128, y: 58),
            count: 9,
            color: cream.withAlphaComponent(0.5)
        )
        drawFurTufts(
            from: NSPoint(x: 72, y: 91),
            to: NSPoint(x: 130, y: 94),
            count: 8,
            color: darkGolden.withAlphaComponent(0.33)
        )
    }

    private func drawFeatheredLeg(x: CGFloat, y: CGFloat, behind: Bool = false) {
        let alpha: CGFloat = behind ? 0.72 : 1
        fillGradientRoundedRect(
            NSRect(x: x, y: y, width: 24, height: 49),
            radius: 11,
            colors: [
                deepGolden.withAlphaComponent(alpha),
                golden.withAlphaComponent(alpha),
                lightGolden.withAlphaComponent(alpha)
            ]
        )
        fillGradientEllipse(
            NSRect(x: x - 3, y: y - 2, width: 31, height: 15),
            colors: [
                darkGolden.withAlphaComponent(alpha),
                lightGolden.withAlphaComponent(alpha),
                highlightGolden.withAlphaComponent(alpha)
            ]
        )
        for toe in 0..<3 {
            strokeArc(
                center: NSPoint(x: x + 7 + CGFloat(toe) * 6, y: y + 4),
                radius: 3,
                start: 0.15,
                end: 1.35,
                color: darkGolden.withAlphaComponent(0.42 * alpha)
            )
        }
        for offset in stride(from: CGFloat(1), through: 20, by: 4) {
            strokePath(
                points: [
                    CGPoint(x: x + offset, y: y + 15),
                    CGPoint(x: x + offset - 3, y: y + 4)
                ],
                color: cream.withAlphaComponent(0.68),
                width: 1.5,
                lineCap: .round
            )
        }
    }

    private func drawRaisedPaw(from start: NSPoint, to end: NSPoint, vertical: Bool) {
        strokePath(points: [start, end], color: darkGolden, width: 20, lineCap: .round)
        strokePath(points: [start, end], color: golden, width: 15, lineCap: .round)
        let pawRect = vertical
            ? NSRect(x: end.x - 9, y: end.y - 2, width: 22, height: 27)
            : NSRect(x: end.x - 2, y: end.y - 9, width: 28, height: 21)
        fillEllipse(pawRect, color: lightGolden)
    }

    private func drawNamastePaws() {
        strokePath(
            points: [CGPoint(x: 91, y: 66), CGPoint(x: 126, y: 69), CGPoint(x: 139, y: 91)],
            color: golden,
            width: 15,
            lineCap: .round
        )
        strokePath(
            points: [CGPoint(x: 118, y: 64), CGPoint(x: 139, y: 91)],
            color: golden,
            width: 15,
            lineCap: .round
        )
        fillEllipse(NSRect(x: 131, y: 87, width: 18, height: 25), color: lightGolden)
    }

    private func drawEar(x: CGFloat, y: CGFloat, mirrored: Bool, compact: Bool) {
        let length: CGFloat = compact ? 31 : 43
        let direction: CGFloat = mirrored ? 1 : -1
        let path = NSBezierPath()
        path.move(to: NSPoint(x: x, y: y + 27))
        path.curve(
            to: NSPoint(x: x + direction * 13, y: y - length + 10),
            controlPoint1: NSPoint(x: x + direction * 20, y: y + 19),
            controlPoint2: NSPoint(x: x + direction * 23, y: y - length + 18)
        )
        path.curve(
            to: NSPoint(x: x + direction * 2, y: y + 23),
            controlPoint1: NSPoint(x: x + direction * 5, y: y - length + 3),
            controlPoint2: NSPoint(x: x - direction * 5, y: y + 8)
        )
        path.close()
        let gradient = NSGradient(colors: [deepGolden, darkGolden, golden])
        NSGraphicsContext.saveGraphicsState()
        path.addClip()
        gradient?.draw(in: path.bounds, angle: 90)
        NSGraphicsContext.restoreGraphicsState()
    }

    private func drawFaceDetails(origin: NSPoint, width: CGFloat, height: CGFloat, compact: Bool) {
        let browY = origin.y + height - (compact ? 15 : 17)
        strokeArc(
            center: NSPoint(x: origin.x + 34, y: browY),
            radius: 8,
            start: 0.15,
            end: 1.25,
            color: darkGolden.withAlphaComponent(0.48)
        )
        strokeArc(
            center: NSPoint(x: origin.x + 55, y: browY - 1),
            radius: 8,
            start: 0.15,
            end: 1.25,
            color: darkGolden.withAlphaComponent(0.48)
        )

        for index in 0..<3 {
            let y = origin.y + 10 + CGFloat(index) * 4
            fillEllipse(
                NSRect(x: origin.x + width - 23 - CGFloat(index) * 2, y: y, width: 1.4, height: 1.4),
                color: darkGolden.withAlphaComponent(0.55)
            )
            strokePath(
                points: [
                    CGPoint(x: origin.x + width - 21, y: y),
                    CGPoint(x: origin.x + width + 7, y: y + CGFloat(index - 1) * 4)
                ],
                color: NSColor(calibratedRed: 1, green: 0.97, blue: 0.87, alpha: 0.42),
                width: 0.8,
                lineCap: .round
            )
        }
    }

    private func drawEarFeathering(origin: NSPoint, width: CGFloat) {
        for offset in stride(from: CGFloat(0), through: 18, by: 4.5) {
            strokePath(
                points: [
                    CGPoint(x: origin.x + 4 - offset * 0.2, y: origin.y + 28 - offset),
                    CGPoint(x: origin.x - 5 - offset * 0.3, y: origin.y + 18 - offset)
                ],
                color: lightGolden.withAlphaComponent(0.7),
                width: 1.6,
                lineCap: .round
            )
            strokePath(
                points: [
                    CGPoint(x: origin.x + width - 3 + offset * 0.2, y: origin.y + 28 - offset),
                    CGPoint(x: origin.x + width + 6 + offset * 0.3, y: origin.y + 18 - offset)
                ],
                color: lightGolden.withAlphaComponent(0.7),
                width: 1.6,
                lineCap: .round
            )
        }
    }

    private func drawEye(x: CGFloat, y: CGFloat) {
        fillEllipse(NSRect(x: x - 1, y: y - 1, width: 10, height: 12), color: darkGolden.withAlphaComponent(0.5))
        fillGradientEllipse(
            NSRect(x: x, y: y, width: 8, height: 10),
            colors: [
                NSColor(calibratedWhite: 0.02, alpha: 1),
                NSColor(calibratedRed: 0.23, green: 0.14, blue: 0.08, alpha: 1),
                NSColor(calibratedRed: 0.54, green: 0.36, blue: 0.18, alpha: 1)
            ]
        )
        fillEllipse(NSRect(x: x + 1.5, y: y + 6.2, width: 2.7, height: 2.7), color: .white)
        fillEllipse(NSRect(x: x + 4.6, y: y + 2.2, width: 1.2, height: 1.2), color: .white.withAlphaComponent(0.72))
    }

    private func drawClosedEye(x: CGFloat, y: CGFloat) {
        strokePath(
            points: [
                CGPoint(x: x, y: y + 2),
                CGPoint(x: x + 4, y: y),
                CGPoint(x: x + 8, y: y + 2)
            ],
            color: NSColor(calibratedWhite: 0.08, alpha: 1),
            width: 2,
            lineCap: .round
        )
    }

    private func drawCollar(x: CGFloat, y: CGFloat, width: CGFloat) {
        fillRoundedRect(
            NSRect(x: x, y: y, width: width, height: 6),
            radius: 3,
            color: NSColor(calibratedRed: 0.78, green: 0.12, blue: 0.11, alpha: 1)
        )
        fillEllipse(
            NSRect(x: x + width / 2 - 4, y: y - 7, width: 9, height: 9),
            color: NSColor(calibratedRed: 0.96, green: 0.78, blue: 0.22, alpha: 1)
        )
    }

    private func drawSoundLines() {
        let pulse = 3 + sin(animationTime * 18) * 2
        strokeArc(center: NSPoint(x: 194, y: 86), radius: 9 + pulse, start: -0.7, end: 0.7)
        strokeArc(center: NSPoint(x: 194, y: 86), radius: 17 + pulse, start: -0.7, end: 0.7)
    }

    private func drawFetchBall() {
        let color = Self.ballColors[selectedBallIndex]
        let progress = trickProgress
        let center: NSPoint

        if progress < 0.58 {
            let flight = progress / 0.58
            center = NSPoint(
                x: 12 + flight * 174,
                y: 37 + sin(flight * .pi) * 76
            )
        } else {
            center = NSPoint(x: 194, y: 78)
        }
        drawBall(center: center, radius: 11, color: color)
    }

    private func drawBallsAtRest() {
        guard behavior == .idle || behavior == .napping || behavior == .trick(.sit) else { return }
        drawBall(center: NSPoint(x: 27, y: 24), radius: 10, color: Self.ballColors[1])
        drawBall(center: NSPoint(x: 46, y: 20), radius: 9, color: Self.ballColors[2])
        drawBall(center: NSPoint(x: 39, y: 35), radius: 8, color: Self.ballColors[0])
        drawBall(center: NSPoint(x: 59, y: 29), radius: 7, color: Self.ballColors[3])
    }

    private func drawBall(center: NSPoint, radius: CGFloat, color: NSColor) {
        fillEllipse(
            NSRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2),
            color: color
        )
        strokeArc(center: center, radius: radius * 0.62, start: -1.2, end: 1.2, color: .white.withAlphaComponent(0.75))
        fillEllipse(
            NSRect(
                x: center.x - radius * 0.42,
                y: center.y + radius * 0.24,
                width: radius * 0.38,
                height: radius * 0.25
            ),
            color: .white.withAlphaComponent(0.35)
        )
    }

    private func drawShadow() {
        let rect: NSRect
        switch behavior {
        case .napping, .trick(.down):
            rect = NSRect(x: 30, y: 22, width: 166, height: 19)
        default:
            rect = NSRect(x: 35, y: 19, width: 158, height: 18)
        }
        fillEllipse(rect, color: NSColor.black.withAlphaComponent(0.22))
    }

    private var trickProgress: CGFloat {
        guard case .trick(let trick) = behavior else { return 0 }
        let elapsed = max(0, ProcessInfo.processInfo.systemUptime - behaviorStartedAt)
        let progress = min(CGFloat(elapsed / trick.duration), 1)
        return progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - pow(-2 * progress + 2, 3) / 2
    }

    private func applyTrickTransform(to context: CGContext) {
        guard case .trick(let trick) = behavior else { return }

        switch trick {
        case .jump, .sit, .down, .handshake, .highFive, .salute, .namaste, .speak, .fetch:
            break
        case .rollOver:
            context.translateBy(x: 0, y: sin(trickProgress * .pi * 2) * 5)
        }
    }

    private var legAnimationOffset: CGFloat {
        switch behavior {
        case .walking:
            return sin(animationTime * 10) * 5
        case .running, .chasing:
            return sin(animationTime * 17) * 9
        case .trick(.fetch):
            return sin(animationTime * 16) * 6
        default:
            return 0
        }
    }

    private func drawMessage() {
        let now = ProcessInfo.processInfo.systemUptime
        guard let message, now < messageExpiresAt else {
            self.message = nil
            return
        }

        let attributes: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 13, weight: .semibold),
            .foregroundColor: NSColor.labelColor
        ]
        let size = message.size(withAttributes: attributes)
        let bubble = NSRect(
            x: Self.canvasSize.width / 2 - size.width / 2 - 10,
            y: Self.canvasSize.height - 31,
            width: size.width + 20,
            height: 26
        )

        NSColor.windowBackgroundColor.withAlphaComponent(0.95).setFill()
        NSBezierPath(roundedRect: bubble, xRadius: 12, yRadius: 12).fill()
        message.draw(
            at: NSPoint(x: bubble.minX + 10, y: bubble.minY + 5),
            withAttributes: attributes
        )
    }

    private func drawFurTufts(
        from start: NSPoint,
        to end: NSPoint,
        count: Int,
        color: NSColor
    ) {
        guard count > 1 else { return }
        for index in 0..<count {
            let progress = CGFloat(index) / CGFloat(count - 1)
            let x = start.x + (end.x - start.x) * progress
            let y = start.y + (end.y - start.y) * progress
            strokePath(
                points: [
                    CGPoint(x: x, y: y + 5),
                    CGPoint(x: x - 3, y: y - 3),
                    CGPoint(x: x + 2, y: y)
                ],
                color: color,
                width: 1.4,
                lineCap: .round
            )
        }
    }

    private func fillEllipse(_ rect: NSRect, color: NSColor) {
        color.setFill()
        NSBezierPath(ovalIn: rect).fill()
    }

    private func fillGradientEllipse(_ rect: NSRect, colors: [NSColor]) {
        let path = NSBezierPath(ovalIn: rect)
        NSGraphicsContext.saveGraphicsState()
        path.addClip()
        NSGradient(colors: colors)?.draw(in: rect, angle: -35)
        NSGraphicsContext.restoreGraphicsState()
    }

    private func fillRoundedRect(_ rect: NSRect, radius: CGFloat, color: NSColor) {
        color.setFill()
        NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius).fill()
    }

    private func fillGradientRoundedRect(_ rect: NSRect, radius: CGFloat, colors: [NSColor]) {
        let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
        NSGraphicsContext.saveGraphicsState()
        path.addClip()
        NSGradient(colors: colors)?.draw(in: rect, angle: -35)
        NSGraphicsContext.restoreGraphicsState()
    }

    private func strokePath(
        points: [CGPoint],
        color: NSColor,
        width: CGFloat,
        lineCap: CGLineCap
    ) {
        guard let context = NSGraphicsContext.current?.cgContext, let first = points.first else { return }
        context.saveGState()
        context.setStrokeColor(color.cgColor)
        context.setLineWidth(width)
        context.setLineCap(lineCap)
        context.setLineJoin(.round)
        context.move(to: first)
        for point in points.dropFirst() {
            context.addLine(to: point)
        }
        context.strokePath()
        context.restoreGState()
    }

    private func strokeArc(
        center: NSPoint,
        radius: CGFloat,
        start: CGFloat,
        end: CGFloat,
        color: NSColor = .white
    ) {
        guard let context = NSGraphicsContext.current?.cgContext else { return }
        context.saveGState()
        context.setStrokeColor(color.cgColor)
        context.setLineWidth(2)
        context.setLineCap(.round)
        context.addArc(center: center, radius: radius, startAngle: start, endAngle: end, clockwise: false)
        context.strokePath()
        context.restoreGState()
    }

    private func drawText(_ text: String, at point: NSPoint, size: CGFloat, color: NSColor) {
        text.draw(
            at: point,
            withAttributes: [
                .font: NSFont.systemFont(ofSize: size, weight: .bold),
                .foregroundColor: color
            ]
        )
    }
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SearchMascotProps {
    isTyping: boolean;
    isFocused?: boolean;
    className?: string;
}

// Helper for smooth interpolation
const lerp = (start: number, end: number, factor: number) => {
    return start + (end - start) * factor;
};

// Sub-component for a single Slime to handle individual refs and logic cleanly
const SlimeCharacter = ({
    color,
    baseColor,
    darkColor,
    delay,
    isTyping,
    isFocused,
    size = 'md',
    isSad,
    isAngry,
    onHover
}: {
    color: string,
    baseColor: string,
    darkColor: string,
    delay: string,
    isTyping: boolean,
    isFocused: boolean,
    size?: 'sm' | 'md' | 'lg',
    isSad?: boolean,
    isAngry?: boolean,
    onHover?: (isHovering: boolean) => void
}) => {
    const faceRef = useRef<SVGGElement>(null);
    const pupilRef = useRef<SVGGElement>(null);
    const bodyRef = useRef<SVGPathElement>(null);
    const containerRef = useRef<HTMLDivElement>(null); // Apply stretch here

    // Physics State (Refs to persist values without re-renders)
    const physics = useRef({
        currentScaleX: 1,
        currentScaleY: 1,
        targetScaleX: 1,
        targetScaleY: 1,
        currentFaceX: 0,
        targetFaceX: 0,
        currentFaceY: 0,
        targetFaceY: 0,
        currentPupilX: 0,
        targetPupilX: 0,
        currentPupilY: 0,
        targetPupilY: 0,
        // Search Animation State
        searchTargetX: 0,
        searchTargetY: -6,
        nextSearchMove: 0
    });

    // Angry Shake: add small random vibration if angry? Not requested but "angry" usually involves tension.
    // For now, static angry face.

    // Keep isTyping active in ref to access inside loop without dep change
    const isTypingRef = useRef(isTyping);
    useEffect(() => { isTypingRef.current = isTyping; }, [isTyping]);

    // Keep isAngry in ref for animation loop
    const isAngryRef = useRef(isAngry);
    useEffect(() => { isAngryRef.current = isAngry; }, [isAngry]);

    // Size mapping
    const sizeClasses = {
        sm: "w-16 h-14",
        md: "w-24 h-20",
        lg: "w-32 h-28"
    };

    // Animation Loop & Mouse Tracking
    useEffect(() => {
        let frameId: number;

        const handleMouseMove = (e: MouseEvent) => {
            if (isTypingRef.current || !bodyRef.current) return;

            const rect = bodyRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // Face Parallax Targets
            const deltaX = (e.clientX - centerX) / 20;
            const deltaY = (e.clientY - centerY) / 20;
            const limit = 6;
            physics.current.targetFaceX = Math.max(-limit, Math.min(limit, deltaX));
            physics.current.targetFaceY = Math.max(-limit, Math.min(limit, deltaY));

            // Pupil Targets (Move slightly more relative to face for "looking" effect, but clamped)
            const pLimit = 2.5;
            physics.current.targetPupilX = Math.max(-pLimit, Math.min(pLimit, deltaX * 0.8));
            physics.current.targetPupilY = Math.max(-pLimit, Math.min(pLimit, deltaY * 0.8));

            // Stretch Logic: Direct mapping to screen height
            // Top of screen (0) = Max Stretch (1.3)
            // Bottom of screen (height) = Max Squish (0.8)
            const screenH = window.innerHeight;
            const factor = Math.max(0, Math.min(1, e.clientY / screenH)); // 0 to 1



            const maxScale = 1.3;
            const minScale = 0.8;

            const targetY = maxScale - (maxScale - minScale) * factor;

            physics.current.targetScaleY = targetY;
            physics.current.targetScaleX = 1 / targetY; // Preserve volume
        };

        const loop = (timestamp: number) => {
            const state = physics.current;
            const isTy = isTypingRef.current;
            const isAng = isAngryRef.current; // Exit Intent

            // Determine targets based on mode
            let tScaleY, tScaleX;
            if (isTy) {
                tScaleY = 0.6;
                tScaleX = 1.15; // Controlled squish width (not too wide)
            } else {
                tScaleY = state.targetScaleY;
                tScaleX = state.targetScaleX;
            }

            let tFaceX, tFaceY, tPupilX, tPupilY;
            let moveSmoothness = 0.1; // Default responsiveness

            if (isTy) {
                tFaceX = 0;
                tFaceY = 0;
                tPupilX = 0;
                tPupilY = 0;
            } else if (isAng) {
                // ANGRY / EXIT SEARCH ANIMATION (Organic)
                // Check if it's time to pick a new spot
                if (timestamp > state.nextSearchMove) {
                    // Pick random spot mainly Looking UP
                    // X: Random Left/Right (-8 to 8)
                    // Y: Random Up (-12 to -4)
                    state.searchTargetX = (Math.random() - 0.5) * 16;
                    state.searchTargetY = -4 - (Math.random() * 8);

                    // Set next move time (Random 1s to 3s)
                    state.nextSearchMove = timestamp + 1000 + Math.random() * 2000;
                }

                tFaceX = state.searchTargetX;
                tFaceY = state.searchTargetY;

                tPupilX = tFaceX * 1.2; // Pupils move slightly more
                tPupilY = -1.5; // Look UP (Adjusted to stay visible in squint)0.8;

                // Very slow, organic drift
                moveSmoothness = 0.05;
            } else {
                // Normal Mouse Follow
                tFaceX = state.targetFaceX;
                tFaceY = state.targetFaceY;
                tPupilX = state.targetPupilX;
                tPupilY = state.targetPupilY;
            }

            // Interpolate (Lerp) for smoothness
            // Use dynamic smoothness based on mode
            state.currentScaleY = lerp(state.currentScaleY, tScaleY, moveSmoothness);
            state.currentScaleX = lerp(state.currentScaleX, tScaleX, moveSmoothness);
            state.currentFaceX = lerp(state.currentFaceX, tFaceX, moveSmoothness);
            state.currentFaceY = lerp(state.currentFaceY, tFaceY, moveSmoothness);
            state.currentPupilX = lerp(state.currentPupilX, tPupilX, moveSmoothness);
            state.currentPupilY = lerp(state.currentPupilY, tPupilY, moveSmoothness);

            // Apply transforms directly to DOM
            if (containerRef.current) {
                containerRef.current.style.transform = `scale(${state.currentScaleX}, ${state.currentScaleY})`;
            }
            if (faceRef.current) {
                faceRef.current.style.transform = `translate(${state.currentFaceX}px, ${state.currentFaceY}px)`;
            }
            if (pupilRef.current) {
                pupilRef.current.style.transform = `translate(${state.currentPupilX}px, ${state.currentPupilY}px)`;
            }

            frameId = requestAnimationFrame(loop);
        };

        window.addEventListener('mousemove', handleMouseMove);
        frameId = requestAnimationFrame(loop);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(frameId);
        };
    }, []); // Run once, refs handle updates

    const gradId = `slimeGrad-${color}`;

    return (
        <div
            className={cn("relative flex flex-col justify-end items-center pointer-events-auto", sizeClasses[size])}
            onMouseEnter={() => onHover?.(true)}
            onMouseLeave={() => onHover?.(false)}
        >
            <div
                ref={containerRef}
                className={cn("relative w-full h-full origin-bottom", isTyping ? "z-0" : "hover:z-10")}
            // Note: transition removed for transform/scale to allow JS physics loop control
            >
                <style jsx>{`
                    @keyframes jelly-${color} {
                        0%, 100% { transform: scale(1, 1); }
                        25% { transform: scale(0.95, 1.05) skewX(-2deg); }
                        50% { transform: scale(1.05, 0.95) skewX(2deg); }
                        75% { transform: scale(0.98, 1.02) skewX(-1deg); }
                    }
                    @keyframes drift-1 {
                        0%, 100% { transform: translate(0, 0); }
                        33% { transform: translate(2px, -3px); }
                        66% { transform: translate(-1px, 2px); }
                    }
                    @keyframes drift-2 {
                        0%, 100% { transform: translate(0, 0); }
                        50% { transform: translate(-2px, -2px); }
                    }
                    @keyframes drift-3 {
                        0%, 100% { transform: translate(0, 0); }
                        50% { transform: translate(1px, 3px); }
                    }
                `}</style>

                {/* Inner SVG handles the Jelly animation (CSS) */}
                {/* We apply the JS stretch to the PARENT div */}
                <svg
                    viewBox="0 0 100 95"
                    className={cn(
                        "w-full h-full drop-shadow-md ease-in-out origin-bottom", // ease-in-out for css jelly
                    )}
                    style={{
                        overflow: 'visible',
                        animation: isTyping ? 'none' : `jelly-${color} 4s infinite ease-in-out ${delay}`
                    }}
                >
                    <defs>
                        {/* Enhanced Gradient for Volume/Translucency */}
                        <radialGradient id={gradId} cx="30%" cy="30%" r="90%" fx="30%" fy="30%">
                            {/* SMIL Animation for shifting liquid center */}
                            <animate attributeName="fx" values="30%; 38%; 25%; 30%" dur="7s" repeatCount="indefinite" />
                            <animate attributeName="fy" values="30%; 22%; 35%; 30%" dur="8s" repeatCount="indefinite" />
                            <stop offset="0%" stopColor={baseColor} stopOpacity="0.98" />
                            <stop offset="70%" stopColor={darkColor} stopOpacity="0.95" />
                            <stop offset="100%" stopColor={darkColor} stopOpacity="1" />
                        </radialGradient>
                        <clipPath id={`eyeClip-${color}`}>
                            <circle cx="35" cy="65" r="5" />
                            <circle cx="65" cy="65" r="5" />
                        </clipPath>
                    </defs>

                    <path
                        ref={bodyRef}
                        d="M50,25 C80,25 90,50 90,75 C90,85 85,95 70,95 L30,95 C15,95 10,85 10,75 C10,50 20,25 50,25 Z"
                        fill={`url(#${gradId})`}
                        className="transition-all duration-300"
                    />

                    {/* Inner Bubbles (Trapped Air) - Animated */}
                    <g className="transition-transform duration-1000 ease-in-out" style={{ transform: isTyping ? 'translateY(-2px)' : 'translateY(0)' }}>
                        <circle cx="45" cy="45" r="3" fill="white" opacity="0.2" style={{ animation: 'drift-1 5s infinite ease-in-out' }} />
                        <circle cx="75" cy="55" r="2" fill="white" opacity="0.15" style={{ animation: 'drift-2 7s infinite ease-in-out' }} />
                        <circle cx="20" cy="65" r="1.5" fill="white" opacity="0.15" style={{ animation: 'drift-3 6s infinite ease-in-out' }} />
                        <circle cx="60" cy="30" r="2.5" fill="white" opacity="0.18" style={{ animation: 'drift-1 8s infinite ease-in-out reverse' }} />
                        <circle cx="35" cy="80" r="1" fill="white" opacity="0.12" style={{ animation: 'drift-2 9s infinite ease-in-out' }} />
                    </g>

                    {/* Rim Light / Subsurface Scattering (Bottom Glow) */}
                    <path d="M20,80 Q50,90 80,80" stroke="white" strokeWidth="2" opacity="0.1" fill="none" strokeLinecap="round" />

                    {/* Highlights (Wet/Shiny Look) */}
                    <path d="M25,35 Q50,25 75,35" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.5" fill="none" />
                    <circle cx="22" cy="45" r="2.5" fill="white" opacity="0.4" />
                    <ellipse cx="80" cy="40" rx="1.5" ry="3" transform="rotate(-15 80 40)" fill="white" opacity="0.3" />

                    {/* Face Group */}
                    <g ref={faceRef}>
                        <g
                            className="transition-transform duration-300"
                            style={{
                                transformOrigin: "center",
                                transform: isTyping ? "scale(1, 0.2)" : "scale(1, 1)"
                            }}
                        >
                            {/* Eye Bases (Dark Blue Sclera) - Clipped by the definition above if needed, but here simple circles */}
                            <circle cx="35" cy="65" r="5" fill="#1e3a8a" />
                            <circle cx="65" cy="65" r="5" fill="#1e3a8a" />

                            {/* Angry Eyebrows - Visible when Angry */}
                            <g
                                style={{
                                    opacity: isAngry ? 1 : 0,
                                    transform: isAngry ? 'translateY(0)' : 'translateY(-5px)',
                                    transition: 'all 0.3s ease-out'
                                }}
                            >
                                {/* Left Eyebrow (Slanted) */}
                                <path d="M28,55 L42,60" stroke="#1e3a8a" strokeWidth="3" strokeLinecap="round" />
                                {/* Right Eyebrow (Slanted) */}
                                <path d="M72,55 L58,60" stroke="#1e3a8a" strokeWidth="3" strokeLinecap="round" />
                            </g>

                            {/* Moving Pupils (Darker/Black) - Clipped to stay inside eyes */}
                            <g ref={pupilRef} clipPath={`url(#eyeClip-${color})`}>
                                <circle cx="35" cy="65" r="2.5" fill="black" opacity="0.7" />
                                <circle cx="65" cy="65" r="2.5" fill="black" opacity="0.7" />

                                {/* Highlights (White Glint) */}
                                <circle cx="33" cy="63" r="1.5" fill="white" opacity={isTyping ? 0 : 0.4} />
                                <circle cx="63" cy="63" r="1.5" fill="white" opacity={isTyping ? 0 : 0.4} />
                            </g>
                        </g>


                        {/* Mouth */}
                        <path
                            d={isTyping
                                ? "M45,75 Q50,75 55,75" // Flat/Typing
                                : (isSad || isAngry)
                                    ? "M45,78 Q50,70 55,78" // Sad/Frown (Used for Angry too)
                                    : "M45,72 Q50,78 55,72" // Normal Smile
                            }
                            fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" className="transition-all duration-300"
                        />
                        <ellipse cx="30" cy="72" rx="3" ry="2" fill={darkColor} opacity="0.3" />
                        <ellipse cx="70" cy="72" rx="3" ry="2" fill={darkColor} opacity="0.3" />
                    </g>
                </svg>
            </div>
            {/* Colored Border Bar - Removed as per new requirement */}
        </div>
    );
};

export function MascotBorderOverlay({ isVisible, scale = 1 }: { isVisible: boolean; scale?: number }) {
    const [progress, setProgress] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const requestRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);

    // Measure container size
    useEffect(() => {
        if (!containerRef.current) return;

        const updateSize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, []);

    // Animation Loop
    useEffect(() => {
        if (isVisible) {
            startTimeRef.current = performance.now();
            const duration = 4000;

            const animate = (time: number) => {
                const elapsed = time - (startTimeRef.current || time);
                const p = Math.min(elapsed / duration, 1);
                // Linear easing to avoid specific slow-down near the end (stutter effect)
                const ease = p;

                setProgress(ease);

                if (p < 1) {
                    requestRef.current = requestAnimationFrame(animate);
                }
            };
            requestRef.current = requestAnimationFrame(animate);
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            setProgress(0);
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isVisible]);

    // Path Generation (Pill Shape)
    // New Strategy: Start at Bottom-Right of straight segment
    // This puts the Top Edge in the middle of the path data, allowing smooth expansion
    // to Left (Left Cap) and Right (Right Cap) without hitting index 0 issues.

    // Coordinates:
    // Top-Left Straight Start: (r, 0)
    // Top-Right Straight End: (w-r, 0)
    // Bottom-Right Straight Start: (w-r, h)  <-- START HERE
    // Bottom-Left Straight End: (r, h)

    const r = dimensions.height / 2;
    const w = dimensions.width;
    const h = dimensions.height;

    // Safety check
    if (w === 0 || h === 0) return <div ref={containerRef} className="absolute inset-0 z-20 pointer-events-none rounded-full" />;

    const straightLen = Math.max(0, w - h);
    const arcLen = Math.PI * r;
    const perimeter = (straightLen * 2) + (arcLen * 2);

    // Path Strategy: Calculate clip seam based on scale
    // For hero (scale=1): use 184px (proven equilibrium)
    // For navbar (scale=0.4): scale proportionally
    const baseClipSeam = 184;
    const scaledClipSeam = scale === 1 ? baseClipSeam : baseClipSeam * scale;
    const clipSeam = Math.min(w / 2, scaledClipSeam);

    // Decoupled Seams to prevent wrap artifacts
    // Offsets scaled by scale factor
    const seamOrange = clipSeam + (60 * scale);
    const seamPurple = clipSeam - (60 * scale);

    // Generate Path Data with dynamic path seam
    const getPathData = (sx: number) => `
        M ${sx},${h}
        L ${r},${h}
        A ${r},${r} 0 0 1 ${r},0
        L ${w - r},0
        A ${r},${r} 0 0 1 ${w - r},${h}
        L ${sx},${h}
        Z
    `;

    // Slime Sizes: Orange (sm/64px), Blue (lg/128px), Purple (md/96px). 
    // Positioned absolute right-8 (32px) in parent.
    // Calculations from Right Edge (w):

    // Orange and Purple travel along arcs + top edge
    // Blue only travels along top edge
    // To synchronize arrival, blue needs to start further back
    // Arc length compensation: arcLen ≈ π * r ≈ 3.14 * (h/2)
    // For typical navbar height ~36px, arcLen ≈ 56px
    // We need to shift blue's center left by approximately arcLen to compensate

    const centerPurple = w - (80 * scale);
    const centerBlue = w - (192 * scale); // Start from blue's actual position
    const centerOrange = w - (288 * scale);

    // Boundaries (Contact points between slimes)
    // splitLeft = w - 256;
    // splitRight = w - 128;
    const splitLeft = w - (256 * scale);
    const splitRight = w - (128 * scale);

    // Slant for diagonal seams on top stick (creates \ shape)
    const slant = 15 * scale;

    const getPathPosFromPx = (screenX: number, sx: number) => {
        // Path starts at sx (Bottom).
        // Distance to Top-Left Corner = (sx - r) + LeftCap
        const distToTopLeft = (sx - r) + arcLen;

        // Distance on Top Edge = screenX - r
        const distOnTop = Math.max(0, Math.min(straightLen, screenX - r));

        return distToTopLeft + distOnTop;
    };

    const getSvgStyle = (centerPx: number, color: string, sx: number, speedMultiplier: number = 1) => {
        const centerPos = getPathPosFromPx(centerPx, sx);

        // Ensure enough length to cover full perimeter eventually
        // Speed up slightly to ensure strong closure
        // Apply speed multiplier for colors that need to travel faster (like blue)
        const currentLength = progress * perimeter * 1.5 * speedMultiplier;
        const offset = -(centerPos - currentLength / 2);

        return {
            fill: 'transparent',
            stroke: color,
            strokeWidth: '4px', // Keep constant, not scaled - must be thick enough to cover parent border
            strokeDasharray: `${currentLength} ${perimeter * 3}`,
            strokeDashoffset: offset,
            strokeLinecap: 'round' as const
        };
    };

    return (
        <div
            ref={containerRef}
            className={cn(
                "absolute z-20 pointer-events-none rounded-full overflow-hidden transition-opacity duration-300",
                (!isVisible && progress === 0) ? "opacity-0" : "opacity-100"
            )}
            style={{
                inset: '-2px' // Always -2px to cover the parent's border-2, regardless of scale
            }}
        >
            {/* Orange - Left Side */}
            {/* Clip: 0 to splitLeft+slant on Top. 0 to splitLeft-slant at 50%. */}
            <div
                className="absolute inset-0"
                style={{
                    clipPath: `polygon(0 0, ${splitLeft + slant}px 0, ${splitLeft - slant}px 50%, 50% 50%, ${clipSeam}px 100%, 0 100%)`
                }}
            >
                <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
                    <path d={getPathData(seamOrange)} style={getSvgStyle(centerOrange, '#f97316', seamOrange)} />
                </svg>
            </div>

            {/* Blue - Center */}
            {/* Clip: Fits between Orange and Purple slants. */}
            <div
                className="absolute inset-0"
                style={{
                    clipPath: `polygon(${splitLeft + slant}px 0, ${splitRight + slant}px 0, ${splitRight - slant}px 50%, ${splitLeft - slant}px 50%)`
                }}
            >
                <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
                    <path d={getPathData(clipSeam)} style={getSvgStyle(centerBlue, '#3b82f6', clipSeam)} />
                </svg>
            </div>

            {/* Purple - Right Side */}
            {/* Clip: Starts from Blue slant to end. */}
            <div
                className="absolute inset-0"
                style={{
                    clipPath: `polygon(${splitRight + slant}px 0, 100% 0, 100% 100%, ${clipSeam}px 100%, 50% 50%, ${splitRight - slant}px 50%)`
                }}
            >
                <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
                    <path d={getPathData(seamPurple)} style={getSvgStyle(centerPurple, '#a855f7', seamPurple)} />
                </svg>
            </div>
        </div>
    );
}

export function SearchMascot({ isTyping, isFocused = false, className, scale = 1 }: SearchMascotProps & { scale?: number }) {
    const [mounted, setMounted] = useState(false);
    const [hoveredMascot, setHoveredMascot] = useState<string | null>(null);
    const [isExitIntent, setIsExitIntent] = useState(false);

    useEffect(() => {
        setMounted(true);

        const handleMouseLeave = (e: MouseEvent) => {
            // If exiting via TOP (clientY <= 0)
            if (e.clientY <= 0) {
                setIsExitIntent(true);
            }
        };

        const handleMouseEnter = () => {
            setIsExitIntent(false);
        };

        document.addEventListener('mouseleave', handleMouseLeave);
        document.addEventListener('mouseenter', handleMouseEnter);

        return () => {
            document.removeEventListener('mouseleave', handleMouseLeave);
            document.removeEventListener('mouseenter', handleMouseEnter);
        };
    }, []);

    if (!mounted) return null;

    return (
        <div
            className={cn("flex items-end justify-center", className)}
            aria-hidden="true"
            style={{
                transform: `scale(${scale})`,
                transformOrigin: 'bottom right' // Scale relative to right anchor
            }}
        > {/* Removed gap-1 */}
            {/* Orange Slime - Small */}
            <SlimeCharacter
                color="orange"
                baseColor="#f97316"
                darkColor="#ea580c"
                delay="0s"
                isTyping={isTyping}
                isFocused={isFocused}
                size="sm"
                isSad={!isExitIntent && hoveredMascot !== null && hoveredMascot !== 'orange'}
                isAngry={isExitIntent}
                onHover={(isHovering) => setHoveredMascot(isHovering ? 'orange' : null)}
            />
            {/* Blue Slime - Large */}
            <SlimeCharacter
                color="blue"
                baseColor="#3b82f6"
                darkColor="#2563eb"
                delay="1s"
                isTyping={isTyping}
                isFocused={isFocused}
                size="lg"
                isSad={!isExitIntent && hoveredMascot !== null && hoveredMascot !== 'blue'}
                isAngry={isExitIntent}
                onHover={(isHovering) => setHoveredMascot(isHovering ? 'blue' : null)}
            />
            {/* Purple Slime - Medium */}
            <SlimeCharacter
                color="purple"
                baseColor="#a855f7"
                darkColor="#9333ea"
                delay="2s"
                isTyping={isTyping}
                isFocused={isFocused}
                size="md"
                isSad={!isExitIntent && hoveredMascot !== null && hoveredMascot !== 'purple'}
                isAngry={isExitIntent}
                onHover={(isHovering) => setHoveredMascot(isHovering ? 'purple' : null)}
            />
        </div>
    );
}

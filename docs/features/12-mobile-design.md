# Mobile Responsive Design

## Goal

Adapt the AGI Canary Watcher for mobile devices, providing a "intelligence briefing" experience rather than attempting to replicate the full desktop control room. Mobile must:

- Deliver key information quickly and clearly
- Prioritize scannable summaries over complex visualizations
- Maintain the serious, instrument-like aesthetic
- Link to desktop for full exploration

Mobile is where users check status; desktop is where they investigate.

## User Story

As a mobile user checking AGI Canary Watcher, I want a simplified view optimized for quick status checks, so that I can stay informed on-the-go without needing the full desktop experience.

## Functional Requirements

1. **Mobile Home Layout**

   - Vertical stack, single column
   - Order of elements:
     1. Status header (live indicator, last update)
     2. Canary strip (horizontal scroll)
     3. Capability radar (simplified, smaller)
     4. Today's movement list
     5. "Full instrument →" link
   - No autonomy thermometer (available via nav)

2. **Simplified Radar**

   - Smaller radar chart (fits in viewport)
   - Still interactive (tap axis for tooltip)
   - No ghost lines (too cluttered)
   - Uncertainty shown as single blur level
   - Tap → navigate to mobile capabilities view

3. **Mobile Canary Strip**

   - Horizontally scrollable strip
   - Slightly larger touch targets
   - Tap → popover with details
   - Status colors visible without labels (labels in popover)

4. **Mobile Navigation**

   - Bottom tab bar:
     - Home
     - Autonomy
     - News
     - Timeline
     - Signals (link to desktop)
   - Hamburger menu for secondary links

5. **Mobile Capabilities View**

   - `/capabilities` on mobile
   - List view of axes (no large radar)
   - Each axis: name, bar, delta, arrow
   - Tap axis → detail sheet (slide up)
   - Time scrubber: simplified, preset buttons only

6. **Mobile Autonomy View**

   - `/autonomy` on mobile
   - Vertical autonomy gauge (compact)
   - Risk canaries as card list
   - Tap canary → detail sheet

7. **Mobile Timeline View**

   - `/timeline` on mobile
   - Vertical scroll (not horizontal)
   - Single track at a time (toggle Reality/Fiction)
   - Event cards instead of graph points
   - Search prominently available

8. **Mobile News View**

   - `/news` on mobile
   - Brief card at top
   - Article list below
   - Swipe actions: save, share
   - Pull to refresh

9. **Desktop Redirect Banner**

   - On complex pages, show:
     - "For full analysis, view on desktop"
     - Link/QR code to same page
   - Not intrusive, positioned at bottom

10. **Touch Interactions**
    - All targets minimum 44px
    - Swipe gestures where natural
    - No hover-dependent interactions
    - Haptic feedback on key actions (optional)

## Data Requirements

**Same API endpoints as desktop** - mobile uses same data, different presentation.

**Additional State:**

- `isMobile` detection (media query + user agent)
- Simplified visualization flags
- Touch gesture handlers

## User Flow

### Quick Status Check

1. User opens app on phone
2. Sees: status header, canary strip, brief
3. All canaries green → user reassured
4. Scrolls to "Today's Movement"
5. Notes no significant changes
6. Closes app (30-second interaction)

### Investigating an Alert

1. User receives notification (future feature)
2. Opens app, sees amber canary
3. Taps canary → popover shows details
4. Reads: "Long-horizon signals detected"
5. Taps "Learn more" → mobile autonomy view
6. Reads trigger information
7. Decides to check desktop later for deep dive

### Browsing News on Commute

1. User opens app during commute
2. Navigates to News tab
3. Scrolls through recent articles
4. Taps interesting article
5. Reads summary, taps to open original
6. External link opens in browser

### Mobile Timeline Exploration

1. User curious about AI history
2. Navigates to Timeline tab
3. Toggles to "Fiction" track
4. Scrolls through AI in movies/books
5. Taps "HAL-9000" card
6. Reads cultural context sheet

## Acceptance Criteria

- [ ] Mobile home loads in < 2 seconds on 4G
- [ ] Canary strip scrollable and tappable
- [ ] Simplified radar renders correctly
- [ ] Bottom navigation works across all views
- [ ] Capabilities list view shows all 9 axes
- [ ] Autonomy gauge readable on small screens
- [ ] Timeline scrolls smoothly (60fps)
- [ ] News pull-to-refresh functions
- [ ] Touch targets minimum 44px
- [ ] Works on iOS Safari and Android Chrome
- [ ] Landscape orientation handled gracefully

## Edge Cases

1. **Very small screen (320px width)**

   - Expected behavior: Still functional, some truncation
   - Handling strategy: Minimum supported width, test on iPhone SE

2. **Slow connection (3G)**

   - Expected behavior: Skeleton loaders, graceful degradation
   - Handling strategy: Prioritize text, defer images, cache aggressively

3. **Offline access**

   - Expected behavior: Show cached data with "offline" indicator
   - Handling strategy: Service worker caching (future enhancement)

4. **User rotates to landscape**

   - Expected behavior: Layout adapts, radar larger
   - Handling strategy: Responsive breakpoints, test both orientations

5. **Accessibility zoom enabled**

   - Expected behavior: Still usable at 200% zoom
   - Handling strategy: Test with system zoom, flexible layouts

6. **Fat finger taps (hit wrong target)**

   - Expected behavior: Generous targets, undo where possible
   - Handling strategy: 44px minimum, spacing between targets

7. **iOS safe areas (notch, home indicator)**
   - Expected behavior: Content not obscured
   - Handling strategy: Use env(safe-area-inset-\*) CSS

## Non-Functional Requirements

**Performance:**

- First contentful paint: < 1.5 seconds
- Time to interactive: < 3 seconds
- Lighthouse mobile score: > 90
- Bundle size: < 200KB initial JS

**Visual Design:**

- Same color system as desktop
- Typography scales appropriately
- Maintain "instrument" aesthetic
- No loss of seriousness on mobile

**Accessibility:**

- Touch targets: 44px minimum
- Text size: 16px minimum (no zoom issues)
- Color contrast: WCAG AA
- Screen reader compatible

**Gestures:**

- Pull to refresh on list views
- Swipe to navigate between tabs (optional)
- Tap-and-hold for additional options
- No gesture-only functionality

**Technical:**

- App deployed to Vercel. Core Web Vitals targets for Vercel Edge/Serverless.
- CSS-first responsive design
- React Server Components for initial load
- Lazy load below-fold content
- Intersection Observer for animations
- Test on real devices (not just emulators)

**Breakpoints:**

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Supported Devices:**

- iOS 15+ Safari
- Android 10+ Chrome
- Minimum width: 320px
- Touch and pointer devices

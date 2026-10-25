# Responsive UI rules

- Wrap route content in `Screen`; it centers pages at a 640 point maximum width. Use `maxWidth={960}` for the dashboard.
- Keep flex children shrinkable with `minWidth: 0` and `flexShrink: 1`; truncate long single-line labels with `numberOfLines` and `ellipsizeMode`.
- Use `BottomSheet` for dialogs. It caps width at 520, caps height at 90% of the window, scrolls long content, and respects safe areas and keyboard avoidance.
- Use `ResponsiveActions` for paired confirmation actions. It gives both buttons equal flex, uses a 12 point gap, and stacks primary above secondary when space or text scale is tight.
- Let chips wrap and keep interactive controls at least 44 points high. Prefer the shared spacing tokens over one-off gaps.

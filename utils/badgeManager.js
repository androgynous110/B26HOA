export const BadgeManager = (() => {
    const updateBadge = (badgeId, count) => {
        const badge = document.getElementById(badgeId);
        if (!badge) return;

        badge.textContent = count;
        badge.style.display = count > 0 ? "inline-block" : "none";
    };

    return { updateBadge };
})();

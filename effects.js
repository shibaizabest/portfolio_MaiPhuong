(function () {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function updateProgress() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const progress = max > 0 ? Math.min(100, Math.max(0, (scrollTop / max) * 100)) : 0;
        document.body.style.setProperty("--scroll-progress", progress + "%");
    }

    function markRevealTargets() {
        const selectors = [
            ".card",
            ".task-card",
            ".reflection-card",
            ".report-section",
            ".profile-card",
            ".section-heading",
            ".closing-section"
        ];

        document.querySelectorAll(selectors.join(",")).forEach((element) => {
            element.classList.add("fx-reveal");
        });
    }

    function setupReveal() {
        const items = Array.from(document.querySelectorAll(".fx-reveal"));
        if (!("IntersectionObserver" in window)) {
            items.forEach((item) => item.classList.add("fx-visible"));
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("fx-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });

        items.forEach((item) => observer.observe(item));
    }

    function setupBackToTop() {
        const button = document.createElement("button");
        button.className = "back-to-top";
        button.type = "button";
        button.setAttribute("aria-label", "Quay lại đầu trang");
        button.textContent = "↑";
        document.body.appendChild(button);

        button.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });

        function toggle() {
            button.classList.toggle("show", window.scrollY > 520);
        }

        window.addEventListener("scroll", toggle, { passive: true });
        toggle();
    }

    function setupPageEnter() {
        requestAnimationFrame(() => {
            document.body.classList.add("fx-page-enter");
        });
    }

    function setupRouteTransitions() {
        const curtain = document.createElement("div");
        curtain.className = "route-curtain";
        curtain.setAttribute("aria-hidden", "true");
        const tileCount = window.innerWidth < 700 ? 7 : 10;
        for (let i = 0; i < tileCount; i += 1) {
            const tile = document.createElement("span");
            tile.className = "route-tile";
            const top = -18 + (i * (132 / Math.max(1, tileCount - 1)));
            const delay = i * 42;
            const size = 25 + ((i % 3) * 5);
            tile.style.setProperty("--tile-top", top.toFixed(1) + "vh");
            tile.style.setProperty("--tile-delay", delay + "ms");
            tile.style.setProperty("--tile-size", size + "vmax");
            curtain.appendChild(tile);
        }
        document.body.appendChild(curtain);

        function resetRouteState() {
            document.body.classList.remove("fx-navigating");
            curtain.classList.remove("leave", "enter");
        }

        window.addEventListener("pageshow", resetRouteState);
        window.addEventListener("pagehide", () => {
            window.setTimeout(resetRouteState, 0);
        });
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") resetRouteState();
        });

        document.querySelectorAll("a[href]").forEach((link) => {
            link.addEventListener("click", (event) => {
                if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                if (link.target === "_blank" || link.hasAttribute("download")) return;

                const href = link.getAttribute("href");
                if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.endsWith(".docx")) return;

                let target;
                try {
                    target = new URL(href, window.location.href);
                } catch (error) {
                    return;
                }

                if (target.origin !== window.location.origin) return;
                if (target.pathname === window.location.pathname && target.hash) return;

                event.preventDefault();
                document.body.classList.add("fx-navigating");
                curtain.classList.remove("enter");
                curtain.classList.add("leave");
                window.setTimeout(() => {
                    window.location.href = target.href;
                }, 760);
            });
        });
    }

    function setupCursorGlow() {
        if (window.matchMedia("(pointer: coarse)").matches) return;

        const orb = document.createElement("div");
        orb.className = "cursor-orb";
        document.body.appendChild(orb);

        let x = window.innerWidth / 2;
        let y = window.innerHeight / 2;
        let targetX = x;
        let targetY = y;

        function animate() {
            x += (targetX - x) * 0.18;
            y += (targetY - y) * 0.18;
            orb.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
            requestAnimationFrame(animate);
        }

        window.addEventListener("pointermove", (event) => {
            targetX = event.clientX;
            targetY = event.clientY;
            document.documentElement.style.setProperty("--fx-x", event.clientX + "px");
            document.documentElement.style.setProperty("--fx-y", event.clientY + "px");
            orb.classList.add("active");
        }, { passive: true });

        document.querySelectorAll("a, button, .card, .report-section, figure").forEach((element) => {
            element.addEventListener("pointerenter", () => orb.classList.add("hover"));
            element.addEventListener("pointerleave", () => orb.classList.remove("hover"));
        });

        animate();
    }

    function setupParticles() {
        const layer = document.createElement("div");
        layer.className = "fx-particles";
        layer.setAttribute("aria-hidden", "true");

        const count = window.innerWidth < 700 ? 12 : 24;
        for (let i = 0; i < count; i += 1) {
            const particle = document.createElement("span");
            particle.className = "fx-particle";
            particle.style.setProperty("--x", Math.round(Math.random() * 100) + "vw");
            particle.style.setProperty("--drift", Math.round((Math.random() * 120) - 60) + "px");
            particle.style.setProperty("--size", Math.round(3 + Math.random() * 7) + "px");
            particle.style.setProperty("--duration", Math.round(9000 + Math.random() * 9000) + "ms");
            particle.style.setProperty("--delay", Math.round(Math.random() * -12000) + "ms");
            layer.appendChild(particle);
        }

        document.body.appendChild(layer);
    }

    function setupRipples() {
        document.querySelectorAll(".button, .nav-list a, .task-pagination a").forEach((element) => {
            element.addEventListener("click", (event) => {
                const rect = element.getBoundingClientRect();
                const ripple = document.createElement("span");
                ripple.className = "ripple";
                ripple.style.left = (event.clientX - rect.left) + "px";
                ripple.style.top = (event.clientY - rect.top) + "px";
                element.appendChild(ripple);
                element.classList.remove("fx-pressed");
                void element.offsetWidth;
                element.classList.add("fx-pressed");
                window.setTimeout(() => ripple.remove(), 650);
                window.setTimeout(() => element.classList.remove("fx-pressed"), 680);
            });
        });
    }

    function setupTilt() {
        if (window.matchMedia("(pointer: coarse)").matches) return;

        document.querySelectorAll(".card, .report-section, .profile-card").forEach((element) => {
            element.addEventListener("pointermove", (event) => {
                const rect = element.getBoundingClientRect();
                const px = (event.clientX - rect.left) / rect.width - 0.5;
                const py = (event.clientY - rect.top) / rect.height - 0.5;
                element.style.setProperty("--tilt-x", (-py * 2.8).toFixed(2) + "deg");
                element.style.setProperty("--tilt-y", (px * 2.8).toFixed(2) + "deg");
                element.style.setProperty("--local-x", ((px + 0.5) * 100).toFixed(1) + "%");
                element.style.setProperty("--local-y", ((py + 0.5) * 100).toFixed(1) + "%");
            });

            element.addEventListener("pointerleave", () => {
                element.style.setProperty("--tilt-x", "0deg");
                element.style.setProperty("--tilt-y", "0deg");
            });
        });
    }

    function setupMagneticControls() {
        if (window.matchMedia("(pointer: coarse)").matches) return;

        document.querySelectorAll(".button, .nav-list a, .task-pagination a").forEach((element) => {
            element.addEventListener("pointermove", (event) => {
                const rect = element.getBoundingClientRect();
                const x = event.clientX - rect.left - rect.width / 2;
                const y = event.clientY - rect.top - rect.height / 2;
                element.style.setProperty("--mag-x", (x * 0.08).toFixed(2) + "px");
                element.style.setProperty("--mag-y", (y * 0.12).toFixed(2) + "px");
            });

            element.addEventListener("pointerleave", () => {
                element.style.setProperty("--mag-x", "0px");
                element.style.setProperty("--mag-y", "0px");
            });
        });
    }

    function setupParallax() {
        const targets = Array.from(document.querySelectorAll(".hero, .page-banner, .report-hero"));
        if (!targets.length) return;

        function update() {
            const y = window.scrollY || 0;
            targets.forEach((target) => {
                target.style.backgroundPosition = `center ${Math.round(y * 0.08)}px`;
            });
        }

        window.addEventListener("scroll", update, { passive: true });
        update();
    }

    function setupLightbox() {
        const images = Array.from(document.querySelectorAll("figure img, .profile-photo"));
        if (!images.length) return;

        const box = document.createElement("div");
        box.className = "lightbox";
        box.innerHTML = '<button type="button" aria-label="Đóng ảnh">×</button><img alt="">';
        document.body.appendChild(box);

        const boxImg = box.querySelector("img");
        const close = box.querySelector("button");

        function hide() {
            box.classList.remove("show");
        }

        images.forEach((image) => {
            image.style.cursor = "zoom-in";
            image.addEventListener("click", () => {
                boxImg.src = image.currentSrc || image.src;
                boxImg.alt = image.alt || "Ảnh minh chứng";
                box.classList.add("show");
            });
        });

        close.addEventListener("click", hide);
        box.addEventListener("click", (event) => {
            if (event.target === box) hide();
        });
        window.addEventListener("keydown", (event) => {
            if (event.key === "Escape") hide();
        });
    }

    function setupActiveSections() {
        const sections = Array.from(document.querySelectorAll(".report-section[id], .task-card[id]"));
        if (!sections.length || !("IntersectionObserver" in window)) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                sections.forEach((section) => section.classList.remove("fx-current"));
                entry.target.classList.add("fx-current");
            });
        }, { threshold: 0.32 });

        sections.forEach((section) => observer.observe(section));
    }

    function init() {
        document.body.classList.add("fx-ready");
        markRevealTargets();
        setupReveal();
        setupBackToTop();
        setupActiveSections();
        setupPageEnter();
        setupRouteTransitions();
        setupRipples();
        setupLightbox();
        updateProgress();
        window.addEventListener("scroll", updateProgress, { passive: true });
        window.addEventListener("resize", updateProgress);

        if (!prefersReducedMotion) {
            setupCursorGlow();
            setupParticles();
            setupTilt();
            setupMagneticControls();
            setupParallax();
        }

        document.querySelectorAll(".hero h1, .page-banner h1, .report-hero h1").forEach((heading) => {
            heading.classList.add("fx-pop");
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

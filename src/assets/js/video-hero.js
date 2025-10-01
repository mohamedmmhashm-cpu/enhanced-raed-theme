/**
 * Video Hero Component - Performance Optimization
 * Handles lazy loading, intersection observer, and video management
 */

class VideoHeroManager {
    constructor() {
        this.videoElements = [];
        this.observers = new Map();
        this.loadedVideos = new Set();
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupVideoHero());
        } else {
            this.setupVideoHero();
        }
    }

    setupVideoHero() {
        // Find all video hero components
        const videoHeroSections = document.querySelectorAll('.s-block--video-hero');
        
        videoHeroSections.forEach((section, index) => {
            this.initializeVideoSection(section, index);
        });

        // Setup intersection observer for performance
        this.setupIntersectionObserver();
    }

    initializeVideoSection(section, index) {
        const videos = section.querySelectorAll('.video-element');
        const iframes = section.querySelectorAll('.youtube-iframe, .vimeo-iframe');
        const posters = section.querySelectorAll('.video-poster');

        // Handle direct video elements
        videos.forEach(video => {
            this.setupVideoElement(video, section);
        });

        // Handle iframe videos (YouTube/Vimeo)
        iframes.forEach(iframe => {
            this.setupIframeElement(iframe, section);
        });

        // Handle poster images
        posters.forEach(poster => {
            this.setupPosterImage(poster);
        });

        // Store reference
        this.videoElements.push({
            section,
            videos: [...videos],
            iframes: [...iframes],
            posters: [...posters]
        });
    }

    setupVideoElement(video, section) {
        // Set initial loading state
        video.setAttribute('data-loaded', 'false');
        
        // Add load event listener
        video.addEventListener('loadeddata', () => {
            video.setAttribute('data-loaded', 'true');
            this.loadedVideos.add(video);
            this.hidePoster(video);
        });

        // Add error handling
        video.addEventListener('error', (e) => {
            console.warn('Video failed to load:', e);
            this.showFallbackPoster(video);
        });

        // Preload metadata only
        video.preload = 'metadata';

        // Handle autoplay with intersection observer
        if (video.hasAttribute('autoplay')) {
            this.setupAutoplayObserver(video, section);
        }
    }

    setupIframeElement(iframe, section) {
        // Lazy load iframe src
        const dataSrc = iframe.getAttribute('data-src');
        if (dataSrc) {
            // Don't load immediately - wait for intersection
            this.setupIframeObserver(iframe, section);
        }
    }

    setupPosterImage(poster) {
        // Lazy load poster images
        if (poster.loading !== 'lazy') {
            poster.loading = 'lazy';
        }

        // Add load event to hide when video is ready
        poster.addEventListener('load', () => {
            poster.classList.add('loaded');
        });
    }

    setupIntersectionObserver() {
        // Create intersection observer for performance
        const observerOptions = {
            root: null,
            rootMargin: '50px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const section = entry.target;
                
                if (entry.isIntersecting) {
                    section.setAttribute('data-in-view', 'true');
                    this.loadSectionContent(section);
                } else {
                    section.setAttribute('data-in-view', 'false');
                    this.pauseSectionVideos(section);
                }
            });
        }, observerOptions);

        // Observe all video hero sections
        this.videoElements.forEach(({ section }) => {
            observer.observe(section);
            this.observers.set(section, observer);
        });
    }

    setupAutoplayObserver(video, section) {
        const autoplayObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Start playing when in view
                    this.playVideo(video);
                } else {
                    // Pause when out of view
                    this.pauseVideo(video);
                }
            });
        }, {
            threshold: 0.5 // Play when 50% visible
        });

        autoplayObserver.observe(section);
    }

    setupIframeObserver(iframe, section) {
        const iframeObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadIframe(iframe);
                    iframeObserver.unobserve(iframe);
                }
            });
        }, {
            rootMargin: '100px'
        });

        iframeObserver.observe(section);
    }

    loadSectionContent(section) {
        // Load videos when section comes into view
        const videos = section.querySelectorAll('.video-element[data-loaded="false"]');
        const iframes = section.querySelectorAll('.youtube-iframe[data-src], .vimeo-iframe[data-src]');

        videos.forEach(video => {
            if (video.readyState === 0) {
                video.load();
            }
        });

        iframes.forEach(iframe => {
            this.loadIframe(iframe);
        });
    }

    loadIframe(iframe) {
        const dataSrc = iframe.getAttribute('data-src');
        if (dataSrc && !iframe.src) {
            iframe.src = dataSrc;
            iframe.removeAttribute('data-src');
            
            // Hide poster when iframe loads
            iframe.addEventListener('load', () => {
                this.hidePosterForIframe(iframe);
            });
        }
    }

    pauseSectionVideos(section) {
        const videos = section.querySelectorAll('.video-element');
        videos.forEach(video => {
            if (!video.paused) {
                this.pauseVideo(video);
            }
        });
    }

    playVideo(video) {
        if (video && video.paused) {
            const playPromise = video.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn('Video autoplay failed:', error);
                });
            }
        }
    }

    pauseVideo(video) {
        if (video && !video.paused) {
            video.pause();
        }
    }

    hidePoster(video) {
        const container = video.closest('.video-hero-background');
        if (container) {
            const poster = container.querySelector('.video-poster');
            if (poster) {
                poster.style.opacity = '0';
                setTimeout(() => {
                    poster.style.display = 'none';
                }, 300);
            }
        }
    }

    hidePosterForIframe(iframe) {
        const container = iframe.closest('.youtube-video-container, .vimeo-video-container');
        if (container) {
            const poster = container.querySelector('.video-poster');
            if (poster) {
                poster.style.opacity = '0';
                setTimeout(() => {
                    poster.style.display = 'none';
                }, 300);
            }
        }
    }

    showFallbackPoster(video) {
        const container = video.closest('.video-hero-background');
        if (container) {
            const poster = container.querySelector('.video-poster');
            if (poster) {
                poster.style.display = 'block';
                poster.style.opacity = '1';
            }
        }
    }

    // Public methods for external control
    playAllVideos() {
        this.videoElements.forEach(({ videos }) => {
            videos.forEach(video => this.playVideo(video));
        });
    }

    pauseAllVideos() {
        this.videoElements.forEach(({ videos }) => {
            videos.forEach(video => this.pauseVideo(video));
        });
    }

    // Cleanup method
    destroy() {
        this.observers.forEach(observer => {
            observer.disconnect();
        });
        this.observers.clear();
        this.videoElements = [];
        this.loadedVideos.clear();
    }
}

// Auto-initialize when script loads
let videoHeroManager;

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        videoHeroManager = new VideoHeroManager();
    });
} else {
    videoHeroManager = new VideoHeroManager();
}

// Handle page visibility changes for performance
document.addEventListener('visibilitychange', () => {
    if (videoHeroManager) {
        if (document.hidden) {
            videoHeroManager.pauseAllVideos();
        }
    }
});

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoHeroManager;
} else if (typeof window !== 'undefined') {
    window.VideoHeroManager = VideoHeroManager;
    window.videoHeroManager = videoHeroManager;
}
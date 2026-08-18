// Hamburger menu functionality
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Toggle hamburger menu
    hamburger.addEventListener('click', function() {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close menu when clicking on a link
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        const isClickInsideMenu = navMenu.contains(event.target);
        const isClickOnHamburger = hamburger.contains(event.target);
        
        if (!isClickInsideMenu && !isClickOnHamburger && navMenu.classList.contains('active')) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        }
    });

    // Form submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const message = document.getElementById('message').value;
            
            // Validate form
            if (name.trim() === '' || email.trim() === '' || message.trim() === '') {
                alert('Please fill in all fields');
                return;
            }
            
            // Validate email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('Please enter a valid email address');
                return;
            }
            
            // Show success message
            alert('Thank you for your message! We will get back to you soon.');
            contactForm.reset();
        });
    }
});

// Smooth scroll to section
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// Add scroll animation for elements
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe metric cards and report cards
document.addEventListener('DOMContentLoaded', function() {
    const cards = document.querySelectorAll('.metric-card, .report-card');
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
});

// Update metric values periodically (demo)
function updateMetrics() {
    const metrics = [
        { selector: '.dashboard .metric-value', values: ['98.5%', '98.6%', '98.4%', '98.7%'] },
        { selector: '.dashboard .metric-value:nth-of-type(2)', values: ['24/7', '24/7', '24/7'] },
        { selector: '.dashboard .metric-value:nth-of-type(3)', values: ['145ms', '148ms', '142ms', '150ms'] },
        { selector: '.dashboard .metric-value:nth-of-type(4)', values: ['99.9%', '99.8%', '99.9%', '99.95%'] }
    ];
    
    // Uncomment to enable periodic metric updates
    // setInterval(() => {
    //     const elements = document.querySelectorAll('.metric-value');
    //     elements.forEach((el, index) => {
    //         if (index < 4) {
    //             const values = metrics[index].values;
    //             const randomValue = values[Math.floor(Math.random() * values.length)];
    //             el.textContent = randomValue;
    //         }
    //     });
    // }, 5000);
}

// Initialize updates
document.addEventListener('DOMContentLoaded', updateMetrics);

// Add active state to nav links based on scroll position
window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section');
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });
    
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
        }
    });
});

// Active nav link styling
const style = document.createElement('style');
style.textContent = `
    .nav-link.active {
        color: var(--primary-color);
        border-bottom: 2px solid var(--primary-color);
        padding-bottom: 5px;
    }
`;
document.head.appendChild(style);

// Alert dismissal functionality
document.addEventListener('DOMContentLoaded', function() {
    const alertItems = document.querySelectorAll('.alert-item');
    alertItems.forEach(alert => {
        const dismissBtn = document.createElement('button');
        dismissBtn.innerHTML = '×';
        dismissBtn.style.cssText = 'background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;';
        dismissBtn.addEventListener('click', function() {
            alert.style.opacity = '0';
            alert.style.transform = 'translateX(-20px)';
            setTimeout(() => alert.remove(), 300);
        });
        alert.appendChild(dismissBtn);
    });
});

// Console message
console.log('%cProduction Monitoring Dashboard', 'font-size: 20px; font-weight: bold; color: #2563eb;');
console.log('Welcome to your production monitoring website!');

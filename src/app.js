// МосМойка Telegram Mini App

// Initialize Telegram WebApp
const tg = window.Telegram?.WebApp;

// API Configuration
const API_URL = 'https://your-backend-url.com'; // Replace with your backend URL

// App State
const state = {
  currentStep: 1,
  selectedService: null,
  selectedDate: null,
  selectedTime: null,
  services: [],
  availableSlots: [],
  currentMonth: new Date(),
  user: null
};

// Services data (fallback if API fails)
const defaultServices = [
  {
    id: 'express',
    name: 'Экспресс-мойка',
    description: 'Быстрая наружная мойка кузова',
    price: 500,
    duration: 15,
    icon: '🚿'
  },
  {
    id: 'standard',
    name: 'Стандарт',
    description: 'Мойка кузова + пылесос салона',
    price: 800,
    duration: 30,
    icon: '🚗'
  },
  {
    id: 'comfort',
    name: 'Комфорт',
    description: 'Полная мойка + чернение резины + полироль',
    price: 1200,
    duration: 45,
    icon: '✨'
  },
  {
    id: 'premium',
    name: 'Премиум',
    description: 'Комплексная мойка + химчистка салона',
    price: 2500,
    duration: 90,
    icon: '👑'
  },
  {
    id: 'detailing',
    name: 'Детейлинг',
    description: 'Полировка кузова + защитное покрытие',
    price: 5000,
    duration: 180,
    icon: '💎'
  },
  {
    id: 'interior',
    name: 'Химчистка салона',
    description: 'Глубокая чистка всех поверхностей салона',
    price: 3500,
    duration: 120,
    icon: '🧹'
  }
];

// Time slots
const allTimeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00'
];

// Month names in Russian
const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initTelegramApp();
  loadServices();
  renderCalendar();
  setupEventListeners();
});

// Initialize Telegram Web App
function initTelegramApp() {
  if (tg) {
    tg.ready();
    tg.expand();

    // Apply Telegram theme colors
    const root = document.documentElement;
    if (tg.themeParams) {
      root.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#1a1a2e');
      root.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#ffffff');
      root.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#8b8b9e');
      root.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#4facfe');
      root.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#4facfe');
      root.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
      root.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#16213e');
    }

    // Get user info
    state.user = tg.initDataUnsafe?.user;

    // Setup main button (optional)
    tg.MainButton.setParams({
      text: 'Записаться',
      color: '#4facfe',
      text_color: '#ffffff',
      is_visible: false
    });

    // Enable haptic feedback
    if (tg.HapticFeedback) {
      window.haptic = tg.HapticFeedback;
    }
  }
}

// Load services from API or use defaults
async function loadServices() {
  try {
    const response = await fetch(`${API_URL}/api/services`);
    if (response.ok) {
      state.services = await response.json();
    } else {
      state.services = defaultServices;
    }
  } catch (error) {
    console.log('Using default services');
    state.services = defaultServices;
  }

  renderServices();
}

// Render services
function renderServices() {
  const grid = document.getElementById('servicesGrid');
  grid.innerHTML = '';

  state.services.forEach(service => {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.dataset.serviceId = service.id;

    card.innerHTML = `
      <span class="service-icon">${service.icon}</span>
      <div class="service-info">
        <div class="service-name">${service.name}</div>
        <div class="service-description">${service.description}</div>
        <div class="service-meta">
          <span class="service-price">${service.price} ₽</span>
          <span class="service-duration">⏱ ${service.duration} мин</span>
        </div>
      </div>
      <div class="service-check"></div>
    `;

    card.addEventListener('click', () => selectService(service));
    grid.appendChild(card);
  });
}

// Select service
function selectService(service) {
  state.selectedService = service;

  // Update UI
  document.querySelectorAll('.service-card').forEach(card => {
    card.classList.remove('selected');
  });
  document.querySelector(`[data-service-id="${service.id}"]`).classList.add('selected');

  // Enable next button
  updateNextButton();

  // Haptic feedback
  triggerHaptic('selection_changed');
}

// Render calendar
function renderCalendar() {
  const today = new Date();
  const year = state.currentMonth.getFullYear();
  const month = state.currentMonth.getMonth();

  // Update title
  document.getElementById('calendarTitle').textContent = `${monthNames[month]} ${year}`;

  // Update navigation buttons
  const prevBtn = document.getElementById('prevMonth');
  const isPrevDisabled = year === today.getFullYear() && month === today.getMonth();
  prevBtn.disabled = isPrevDisabled;

  // Get first day of month and total days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Adjust for Monday start (0 = Monday, 6 = Sunday)
  const startDay = firstDay === 0 ? 6 : firstDay - 1;

  const container = document.getElementById('calendarDays');
  container.innerHTML = '';

  // Empty cells before first day
  for (let i = 0; i < startDay; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day empty';
    container.appendChild(emptyDay);
  }

  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateBtn = document.createElement('button');
    dateBtn.className = 'calendar-day';
    dateBtn.textContent = day;

    const currentDate = new Date(year, month, day);
    const dateStr = formatDate(currentDate);

    // Check if date is today
    if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
      dateBtn.classList.add('today');
    }

    // Check if date is in past
    const isPast = currentDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (isPast) {
      dateBtn.classList.add('disabled');
    }

    // Check if selected
    if (state.selectedDate === dateStr) {
      dateBtn.classList.add('selected');
    }

    dateBtn.addEventListener('click', () => {
      if (!isPast) {
        selectDate(dateStr);
      }
    });

    container.appendChild(dateBtn);
  }
}

// Format date as DD.MM.YYYY
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

// Format date for display
function formatDateDisplay(dateStr) {
  const [day, month, year] = dateStr.split('.');
  const date = new Date(year, month - 1, day);
  const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  return `${weekdays[date.getDay()]}, ${day} ${monthNames[month - 1].toLowerCase()}`;
}

// Select date
function selectDate(dateStr) {
  state.selectedDate = dateStr;
  state.selectedTime = null;

  // Update calendar UI
  document.querySelectorAll('.calendar-day').forEach(day => {
    day.classList.remove('selected');
  });
  event.target.classList.add('selected');

  // Update next button
  updateNextButton();

  // Haptic feedback
  triggerHaptic('selection_changed');

  // Load available time slots
  loadTimeSlots(dateStr);
}

// Load time slots from API
async function loadTimeSlots(date) {
  showLoading(true);

  try {
    const response = await fetch(`${API_URL}/api/slots/${date}`);
    if (response.ok) {
      state.availableSlots = await response.json();
    } else {
      // Use all slots if API fails
      state.availableSlots = allTimeSlots;
    }
  } catch (error) {
    console.log('Using default time slots');
    state.availableSlots = allTimeSlots;
  }

  showLoading(false);
}

// Render time slots
function renderTimeSlots() {
  const container = document.getElementById('timeSlots');
  container.innerHTML = '';

  // Check if today, filter out past times
  const today = new Date();
  const [day, month, year] = (state.selectedDate || '').split('.');
  const isToday = today.getDate() === parseInt(day) &&
    today.getMonth() + 1 === parseInt(month) &&
    today.getFullYear() === parseInt(year);

  const currentTime = today.getHours() * 60 + today.getMinutes();

  allTimeSlots.forEach(slot => {
    const slotBtn = document.createElement('button');
    slotBtn.className = 'time-slot';
    slotBtn.textContent = slot;

    // Check if slot is available
    const isAvailable = state.availableSlots.includes(slot);

    // Check if slot is in the past (for today)
    const [hours, minutes] = slot.split(':').map(Number);
    const slotTime = hours * 60 + minutes;
    const isPast = isToday && slotTime <= currentTime + 30; // 30 min buffer

    if (!isAvailable || isPast) {
      slotBtn.classList.add('disabled');
    }

    if (state.selectedTime === slot) {
      slotBtn.classList.add('selected');
    }

    slotBtn.addEventListener('click', () => {
      if (isAvailable && !isPast) {
        selectTime(slot);
      }
    });

    container.appendChild(slotBtn);
  });
}

// Select time
function selectTime(time) {
  state.selectedTime = time;

  // Update UI
  document.querySelectorAll('.time-slot').forEach(slot => {
    slot.classList.remove('selected');
  });
  event.target.classList.add('selected');

  // Update next button
  updateNextButton();

  // Haptic feedback
  triggerHaptic('selection_changed');
}

// Update confirmation summary
function updateSummary() {
  if (state.selectedService) {
    document.getElementById('summaryServiceIcon').textContent = state.selectedService.icon;
    document.getElementById('summaryService').textContent = state.selectedService.name;
    document.getElementById('summaryPrice').textContent = `${state.selectedService.price} ₽`;
  }

  if (state.selectedDate) {
    document.getElementById('summaryDate').textContent = formatDateDisplay(state.selectedDate);
  }

  if (state.selectedTime) {
    document.getElementById('summaryTime').textContent = state.selectedTime;
  }
}

// Setup event listeners
function setupEventListeners() {
  // Navigation buttons
  document.getElementById('nextBtn').addEventListener('click', handleNext);
  document.getElementById('backBtn').addEventListener('click', handleBack);

  // Calendar navigation
  document.getElementById('prevMonth').addEventListener('click', () => {
    state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
    renderCalendar();
    triggerHaptic('impact_light');
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
    renderCalendar();
    triggerHaptic('impact_light');
  });

  // Location button
  document.getElementById('locationBtn').addEventListener('click', () => {
    // Open map
    const mapUrl = 'https://yandex.ru/maps/-/CDQ0rU~v';
    if (tg) {
      tg.openLink(mapUrl);
    } else {
      window.open(mapUrl, '_blank');
    }
    triggerHaptic('impact_medium');
  });

  // Modal close
  document.getElementById('closeModalBtn').addEventListener('click', () => {
    document.getElementById('successModal').classList.remove('active');
    if (tg) {
      tg.close();
    }
  });
}

// Handle next button
function handleNext() {
  triggerHaptic('impact_light');

  if (state.currentStep === 1 && state.selectedService) {
    goToStep(2);
  } else if (state.currentStep === 2 && state.selectedDate) {
    loadTimeSlots(state.selectedDate).then(() => {
      renderTimeSlots();
      goToStep(3);
    });
  } else if (state.currentStep === 3 && state.selectedTime) {
    showConfirmation();
  } else if (state.currentStep === 4) {
    submitBooking();
  }
}

// Handle back button
function handleBack() {
  triggerHaptic('impact_light');

  if (state.currentStep > 1) {
    if (state.currentStep === 4) {
      goToStep(3);
    } else {
      goToStep(state.currentStep - 1);
    }
  }
}

// Go to step
function goToStep(step) {
  state.currentStep = step;

  // Update sections
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });

  // Update step indicators
  document.querySelectorAll('.step').forEach((stepEl, index) => {
    stepEl.classList.remove('active', 'completed');
    if (index + 1 < step) {
      stepEl.classList.add('completed');
    } else if (index + 1 === step) {
      stepEl.classList.add('active');
    }
  });

  // Show current section
  document.getElementById(`step${step}`).classList.add('active');

  // Update back button visibility
  document.getElementById('backBtn').style.display = step > 1 ? 'flex' : 'none';

  // Update next button
  updateNextButton();

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Show confirmation
function showConfirmation() {
  state.currentStep = 4;

  // Hide all sections
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });

  // Mark all steps as completed
  document.querySelectorAll('.step').forEach(stepEl => {
    stepEl.classList.remove('active');
    stepEl.classList.add('completed');
  });

  // Show confirmation section
  document.getElementById('confirmationSection').classList.add('active');

  // Update summary
  updateSummary();

  // Update buttons
  document.getElementById('backBtn').style.display = 'flex';
  document.getElementById('nextBtnText').textContent = 'Подтвердить';
  document.getElementById('nextBtn').disabled = false;

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Submit booking
async function submitBooking() {
  showLoading(true);
  triggerHaptic('notification_success');

  const bookingData = {
    userId: state.user?.id || null,
    userName: state.user?.first_name || 'Гость',
    serviceId: state.selectedService.id,
    date: state.selectedDate,
    time: state.selectedTime,
    price: state.selectedService.price
  };

  try {
    const response = await fetch(`${API_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingData)
    });

    if (response.ok) {
      // Send data to Telegram
      if (tg) {
        tg.sendData(JSON.stringify({
          action: 'booking_confirmed',
          ...bookingData
        }));
      }
    }
  } catch (error) {
    console.log('Booking submitted locally');
  }

  showLoading(false);

  // Show success modal
  document.getElementById('successModal').classList.add('active');
}

// Update next button state
function updateNextButton() {
  const nextBtn = document.getElementById('nextBtn');
  const nextBtnText = document.getElementById('nextBtnText');

  let isEnabled = false;
  let buttonText = 'Далее';

  switch (state.currentStep) {
    case 1:
      isEnabled = state.selectedService !== null;
      buttonText = 'Далее';
      break;
    case 2:
      isEnabled = state.selectedDate !== null;
      buttonText = 'Далее';
      break;
    case 3:
      isEnabled = state.selectedTime !== null;
      buttonText = 'Далее';
      break;
    case 4:
      isEnabled = true;
      buttonText = 'Подтвердить';
      break;
  }

  nextBtn.disabled = !isEnabled;
  nextBtnText.textContent = buttonText;
}

// Show/hide loading
function showLoading(show) {
  const overlay = document.getElementById('loadingOverlay');
  if (show) {
    overlay.classList.add('active');
  } else {
    overlay.classList.remove('active');
  }
}

// Trigger haptic feedback
function triggerHaptic(type) {
  if (window.haptic) {
    switch (type) {
      case 'impact_light':
        window.haptic.impactOccurred('light');
        break;
      case 'impact_medium':
        window.haptic.impactOccurred('medium');
        break;
      case 'selection_changed':
        window.haptic.selectionChanged();
        break;
      case 'notification_success':
        window.haptic.notificationOccurred('success');
        break;
      case 'notification_error':
        window.haptic.notificationOccurred('error');
        break;
    }
  }
}

// Export for debugging
window.appState = state;

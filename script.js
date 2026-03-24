const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  },
  { threshold: 0.18 }
);

reveals.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 45, 260)}ms`;
  observer.observe(item);
});

function setFieldError(fieldId, message) {
  const target = document.getElementById(`${fieldId}-error`);
  if (target) {
    target.textContent = message;
  }
}

function isValidPhone(phone) {
  return /^\+?[\d\s().-]{10,}$/.test(phone.trim());
}

function addNotification(message) {
  const list = document.getElementById('notification-list');
  if (!list) {
    return;
  }
  const entry = document.createElement('li');
  entry.innerHTML = message;
  list.prepend(entry);
}

function setupTopbarBehavior() {
  const topbar = document.querySelector('.topbar');
  if (!topbar) {
    return;
  }

  let idleTimer;

  function setIdleIfStopped() {
    if (window.scrollY <= 20) {
      topbar.classList.remove('is-idle');
      return;
    }
    topbar.classList.add('is-idle');
  }

  window.addEventListener(
    'scroll',
    () => {
      topbar.classList.remove('is-idle');
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(setIdleIfStopped, 700);
    },
    { passive: true }
  );
}

function setupEstimateForm() {
  const floorsInput = document.getElementById('floors');
  const windowsInput = document.getElementById('windows');
  const dateInput = document.getElementById('date');
  const priceChip = document.getElementById('price-chip');
  const slotState = document.getElementById('slot-state');
  const slotList = document.getElementById('slot-list');
  const slotHidden = document.getElementById('selected-slot');
  const form = document.getElementById('estimate-form');
  const submitBtn = document.getElementById('submit-btn');
  const formMessage = document.getElementById('form-message');

  if (
    !floorsInput ||
    !windowsInput ||
    !dateInput ||
    !priceChip ||
    !slotState ||
    !slotList ||
    !slotHidden ||
    !form ||
    !submitBtn ||
    !formMessage
  ) {
    return;
  }

  function updatePricePreview() {
    const floorValue = Number(floorsInput.value);
    const windowValue = Number(windowsInput.value);
    const low = 70 + floorValue * 22 + windowValue * 1.6;
    const high = low + 48;
    priceChip.textContent = `Estimated range: $${Math.round(low)} - $${Math.round(high)}`;
  }

  function showLoadingSlots() {
    slotState.textContent = 'Checking schedule windows...';
    slotList.innerHTML = '';
    const skeletonA = document.createElement('span');
    const skeletonB = document.createElement('span');
    skeletonA.className = 'skeleton';
    skeletonB.className = 'skeleton';
    slotList.append(skeletonA, skeletonB);
  }

  function drawSlots(slots) {
    slotList.innerHTML = '';
    slotHidden.value = '';

    if (!slots.length) {
      slotState.textContent = 'No crew windows available on this date. Try another day.';
      return;
    }

    slotState.textContent = 'Select one time slot to continue.';
    slots.forEach((slotText) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'slot';
      option.textContent = slotText;
      option.setAttribute('role', 'option');

      option.addEventListener('click', () => {
        document.querySelectorAll('#slot-list .slot').forEach((element) => {
          element.classList.remove('selected');
        });
        option.classList.add('selected');
        slotHidden.value = slotText;
        setFieldError('slot', '');
      });

      slotList.appendChild(option);
    });
  }

  function loadSlotsForDate(rawDate) {
    showLoadingSlots();
    setTimeout(() => {
      if (!rawDate) {
        slotState.textContent = 'Choose a date to view available times.';
        slotList.innerHTML = '';
        return;
      }

      const day = new Date(rawDate).getDay();
      if (Number.isNaN(day) || day === 0) {
        drawSlots([]);
        return;
      }

      const weekdaySlots = ['08:15 AM', '10:40 AM', '01:05 PM', '03:20 PM'];
      const saturdaySlots = ['09:10 AM', '11:35 AM'];
      drawSlots(day === 6 ? saturdaySlots : weekdaySlots);
    }, 950);
  }

  function validateEstimateForm() {
    let isValid = true;
    formMessage.textContent = '';

    const nameValue = document.getElementById('name').value.trim();
    const phoneValue = document.getElementById('phone').value.trim();
    const dateValue = dateInput.value;
    const slotValue = slotHidden.value;

    if (!nameValue || nameValue.length < 2) {
      setFieldError('name', 'Please provide a valid full name.');
      isValid = false;
    } else {
      setFieldError('name', '');
    }

    if (!isValidPhone(phoneValue)) {
      setFieldError('phone', 'Please enter a reachable phone number.');
      isValid = false;
    } else {
      setFieldError('phone', '');
    }

    if (!dateValue) {
      setFieldError('date', 'Please select a preferred date.');
      isValid = false;
    } else {
      setFieldError('date', '');
    }

    if (!slotValue) {
      setFieldError('slot', 'Select one available time slot before submitting.');
      isValid = false;
    } else {
      setFieldError('slot', '');
    }

    return isValid;
  }

  floorsInput.addEventListener('change', updatePricePreview);
  windowsInput.addEventListener('change', updatePricePreview);
  dateInput.addEventListener('change', (event) => {
    loadSlotsForDate(event.target.value);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!validateEstimateForm()) {
      formMessage.textContent = 'Please fix the highlighted fields and try again.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending request...';
    formMessage.textContent = 'Submitting details to dispatch...';

    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Request estimate';
      formMessage.textContent =
        'Request received. Dispatch will confirm your visit window by phone within 20 minutes.';
      addNotification('<strong>New lead:</strong> Estimate request sent from website form.');
      form.reset();
      slotList.innerHTML = '';
      slotState.textContent = 'Choose a date to view available times.';
      slotHidden.value = '';
      updatePricePreview();
    }, 1300);
  });

  updatePricePreview();
}

function setupPaymentSystem() {
  const invoiceItems = document.querySelectorAll('.invoice-item');
  const amount = document.getElementById('payment-amount');
  const context = document.getElementById('checkout-context');
  const paymentForm = document.getElementById('payment-form');
  const payBtn = document.getElementById('pay-btn');
  const paymentMessage = document.getElementById('payment-message');

  if (!invoiceItems.length || !amount || !context || !paymentForm || !payBtn || !paymentMessage) {
    return;
  }

  let selectedInvoice = invoiceItems[0];

  function updateSelectedInvoice(item) {
    invoiceItems.forEach((invoice) => invoice.classList.remove('active'));
    item.classList.add('active');
    selectedInvoice = item;
    amount.textContent = `$${item.dataset.amount}`;
    context.textContent = `Paying invoice for ${item.dataset.client}`;
  }

  invoiceItems.forEach((item) => {
    item.addEventListener('click', () => updateSelectedInvoice(item));
  });

  function clearPaymentErrors() {
    ['card-name', 'card-number', 'card-expiry', 'card-cvc', 'billing-email'].forEach((field) => {
      setFieldError(field, '');
    });
  }

  function validatePaymentForm() {
    clearPaymentErrors();
    let valid = true;
    const cardName = document.getElementById('card-name').value.trim();
    const cardNumber = document.getElementById('card-number').value.replace(/\s+/g, '');
    const cardExpiry = document.getElementById('card-expiry').value.trim();
    const cardCvc = document.getElementById('card-cvc').value.trim();
    const billingEmail = document.getElementById('billing-email').value.trim();

    if (cardName.length < 2) {
      setFieldError('card-name', 'Cardholder name is required.');
      valid = false;
    }
    if (!/^\d{16}$/.test(cardNumber)) {
      setFieldError('card-number', 'Use a 16-digit card number.');
      valid = false;
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) {
      setFieldError('card-expiry', 'Use MM/YY format.');
      valid = false;
    }
    if (!/^\d{3,4}$/.test(cardCvc)) {
      setFieldError('card-cvc', 'Use a valid CVC.');
      valid = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail)) {
      setFieldError('billing-email', 'Enter a valid billing email.');
      valid = false;
    }
    return valid;
  }

  paymentForm.addEventListener('submit', (event) => {
    event.preventDefault();
    paymentMessage.textContent = '';

    if (!validatePaymentForm()) {
      paymentMessage.textContent = 'Please check the fields above and try again.';
      return;
    }

    payBtn.disabled = true;
    payBtn.textContent = 'Processing payment...';
    paymentMessage.textContent = 'Authorizing card and recording transaction...';

    setTimeout(() => {
      payBtn.disabled = false;
      payBtn.textContent = 'Pay now';
      paymentMessage.textContent = `Payment confirmed for ${selectedInvoice.dataset.client}. Receipt sent by email.`;
      addNotification(`<strong>Payment posted:</strong> ${selectedInvoice.dataset.client} paid $${selectedInvoice.dataset.amount}.`);
      selectedInvoice.remove();
      const completedList = document.getElementById('completed-jobs');
      if (completedList) {
        const completeItem = document.createElement('li');
        completeItem.textContent = selectedInvoice.dataset.client;
        completedList.prepend(completeItem);
      }

      const remaining = document.querySelector('.invoice-item');
      if (remaining) {
        updateSelectedInvoice(remaining);
      } else {
        amount.textContent = '$0';
        context.textContent = 'No pending invoices';
      }
      paymentForm.reset();
    }, 1200);
  });
}

function setupChatSystem() {
  const chatLog = document.getElementById('chat-log');
  const chatQuick = document.getElementById('chat-quick');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');

  if (!chatLog || !chatQuick || !chatForm || !chatInput) {
    return;
  }

  const suggestions = [
    'What areas do you serve?',
    'How fast can you book me?',
    'Do you clean second floor windows?',
    'Can I set recurring cleaning?'
  ];

  function appendBubble(role, message) {
    const bubble = document.createElement('div');
    bubble.className = `bubble ${role}`;
    bubble.textContent = message;
    chatLog.appendChild(bubble);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function getBotReply(input) {
    const text = input.toLowerCase();
    if (text.includes('area') || text.includes('serve') || text.includes('location')) {
      return 'We cover downtown, Westfield, Rivermill, and nearby neighborhoods within a 30-minute dispatch radius.';
    }
    if (text.includes('fast') || text.includes('book') || text.includes('available')) {
      return 'Standard bookings are available in 24-48 hours, and urgent storefront requests can often be handled same day.';
    }
    if (text.includes('recurring') || text.includes('weekly') || text.includes('monthly')) {
      return 'Yes. We support weekly, bi-weekly, and monthly plans with fixed crew windows so your storefront stays consistent.';
    }
    if (text.includes('second') || text.includes('floor') || text.includes('high')) {
      return 'Yes, up to three floors for residential jobs. We use extension rigs and safety anchors for upper glass access.';
    }
    if (text.includes('price') || text.includes('cost') || text.includes('quote')) {
      return 'You can use the booking form above for an instant estimate, then dispatch confirms final pricing after access review.';
    }
    if (text.includes('callback') || text.includes('call me')) {
      addNotification('<strong>Chat escalation:</strong> Customer asked for callback from dispatch.');
      return 'Done. I flagged dispatch for a callback request. A coordinator will contact you shortly.';
    }
    return 'I can help with pricing, availability, service areas, and recurring plans. Ask a specific question and I will route it fast.';
  }

  suggestions.forEach((text) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chat-chip';
    chip.textContent = text;
    chip.addEventListener('click', () => {
      chatInput.value = text;
      chatForm.requestSubmit();
    });
    chatQuick.appendChild(chip);
  });

  appendBubble('bot', 'Hello, I am the Northglass assistant. I can answer service questions and help you book quickly.');

  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const userMessage = chatInput.value.trim();
    if (!userMessage) {
      return;
    }

    appendBubble('user', userMessage);
    chatInput.value = '';

    setTimeout(() => {
      appendBubble('bot', getBotReply(userMessage));
    }, 520);
  });
}

function setupScheduleSystem() {
  const scheduleForm = document.getElementById('schedule-form');
  const scheduleMessage = document.getElementById('schedule-message');
  const shiftList = document.getElementById('shift-list');

  if (!scheduleForm || !scheduleMessage || !shiftList) {
    return;
  }

  function validateShift() {
    let valid = true;
    ['shift-date', 'shift-start', 'shift-end', 'shift-task'].forEach((field) => {
      setFieldError(field, '');
    });

    const shiftDate = document.getElementById('shift-date').value;
    const shiftStart = document.getElementById('shift-start').value;
    const shiftEnd = document.getElementById('shift-end').value;
    const shiftTask = document.getElementById('shift-task').value.trim();

    if (!shiftDate) {
      setFieldError('shift-date', 'Select a shift date.');
      valid = false;
    }
    if (!shiftStart) {
      setFieldError('shift-start', 'Select a start time.');
      valid = false;
    }
    if (!shiftEnd) {
      setFieldError('shift-end', 'Select an end time.');
      valid = false;
    }
    if (shiftStart && shiftEnd && shiftEnd <= shiftStart) {
      setFieldError('shift-end', 'End time must be after start time.');
      valid = false;
    }
    if (!shiftTask || shiftTask.length < 5) {
      setFieldError('shift-task', 'Add a clear focus task.');
      valid = false;
    }
    return valid;
  }

  scheduleForm.addEventListener('submit', (event) => {
    event.preventDefault();
    scheduleMessage.textContent = '';

    if (!validateShift()) {
      scheduleMessage.textContent = 'Please fix the highlighted shift details.';
      return;
    }

    const member = document.getElementById('team-member').value;
    const priority = document.getElementById('priority').value;
    const shiftDate = document.getElementById('shift-date').value;
    const shiftStart = document.getElementById('shift-start').value;
    const shiftEnd = document.getElementById('shift-end').value;
    const shiftTask = document.getElementById('shift-task').value.trim();

    const li = document.createElement('li');
    const priorityClass = priority.toLowerCase();
    li.innerHTML = `
      <div>
        <strong>${member}</strong>
        <p>${shiftDate} ${shiftStart} - ${shiftEnd} | ${shiftTask}</p>
      </div>
      <span class="tag ${priorityClass}">${priority}</span>
    `;

    shiftList.prepend(li);
    scheduleMessage.textContent = 'Shift added. Team queue was reprioritized successfully.';
    addNotification(`<strong>Schedule update:</strong> ${member} assigned ${priority.toLowerCase()} priority shift.`);
    scheduleForm.reset();
  });
}

setupTopbarBehavior();
setupEstimateForm();
setupPaymentSystem();
setupChatSystem();
setupScheduleSystem();

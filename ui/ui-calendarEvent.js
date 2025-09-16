import { fetchEventsForMonth, insertEvent, deleteEvent as deleteEventAPI } from '../api/api-calendarEvent.js';
import { SoundManager } from '../utils/soundManager.js';

const calendar = (() => {
  const userProfile = JSON.parse(localStorage.getItem('user'));
  const user_id = userProfile?.id;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  let currentDate = new Date();
  let selectedDate = null;

  const monthYearLabel = document.getElementById("monthYear");
  const calendarDays = document.getElementById("calendarDays");
  const eventArea = document.getElementById("eventArea");
  const upcomingEventsArea = document.getElementById("upcomingEventsArea");

  const init = () => {
    renderCalendar(currentDate);
    renderUpcomingEvents();
  };

  const getDateKey = (date) => {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  };

  const renderCalendar = (date) => {
    calendarDays.innerHTML = "";
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    monthYearLabel.textContent = `${monthNames[month]} ${year}`;

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement("div");
      empty.className = "day empty";
      calendarDays.appendChild(empty);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const day = document.createElement("div");
      day.className = "day";
      day.textContent = i;
      day.onclick = () => {
        selectedDate = new Date(year, month, i);
        showEvents(selectedDate);
      };
      calendarDays.appendChild(day);
    }
  };

  const changeMonth = (step) => {
    currentDate.setMonth(currentDate.getMonth() + step);
    renderCalendar(currentDate);
    eventArea.innerHTML = `<p>Select a day to view or add events.</p>`;
  };

  const showEvents = async (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const isoDate = date.toISOString().split("T")[0];

    const { data: monthEvents, error } = await fetchEventsForMonth(year, month);
    if (error) {
      eventArea.innerHTML = "<p>Error loading events.</p>";
      return;
    }

    const filtered = monthEvents?.filter(e => e.event_date === isoDate);

    let html = `
      <strong>Events for ${monthNames[month]} ${date.getDate()}, ${year}</strong>
      <div class="event-list">
        ${!filtered.length ? "<p>No events.</p>" : filtered.map(e => `
          <div class="event-item">
            <strong>${e.title}</strong><br>
            <small>${e.description}</small><br>
            <button class="delete-btn" onclick="window.calendar.deleteEvent('${e.id}')">&times;</button>
          </div>
        `).join("")}
      </div>
      <div class="event-form">
        <input type="text" id="eventTitle" placeholder="Event title" />
        <textarea id="eventDescription" placeholder="Event description"></textarea>
        <button onclick="calendar.addEvent()">Add Event</button>
      </div>
    `;

    eventArea.innerHTML = html;
  };

  const addEvent = async () => {
    try {
      const title = document.getElementById("eventTitle").value.trim();
      const description = document.getElementById("eventDescription").value.trim();

      if (!selectedDate) {
        alert("Please select a date first.");
        return;
      }
      if (!title) {
        alert("Event title is required.");
        return;
      }

      const event_date = selectedDate.toISOString().split("T")[0];
      const { error } = await insertEvent({ title, description, event_date, user_id });

      if (error) {
        console.error("Insert event error:", error);
        alert("Failed to add event.");
        return;
      }

      document.getElementById("eventTitle").value = "";
      document.getElementById("eventDescription").value = "";

      showEvents(selectedDate);
      renderUpcomingEvents();
      SoundManager.playConfirmation();
    } catch (err) {
      console.error("Unexpected error in addEvent:", err);
      alert("An unexpected error occurred while adding the event.");
    }
  };


  const renderUpcomingEvents = async () => {
    upcomingEventsArea.innerHTML = "";
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const { data: events, error } = await fetchEventsForMonth(year, month);
    let html = `<h3>Upcoming Events for ${monthNames[month]} ${year}</h3>`;

    if (error || !events) {
      upcomingEventsArea.innerHTML = html + "<p>Error loading events.</p>";
      return;
    }

    if (!events.length) {
      upcomingEventsArea.innerHTML = html + "<p>No upcoming events.</p>";
      return;
    }

    html += events.map(e => `
      <div class="event-item">
        <strong>${e.title}</strong><br>
        <small>${e.event_date}</small><br>
        <small>Posted by: ${e.users?.username || 'unknown'} (${e.users?.role || 'n/a'})</small><br>
        <small>${e.description}</small><br>
        <button class="delete-btn" onclick="window.calendar.deleteEvent('${e.id}')">&times;</button>
      </div>
    `).join("");

    upcomingEventsArea.innerHTML = html;
  };

  const deleteEvent = async (eventId) => {
    try {
      const { error } = await deleteEventAPI(eventId);
      if (error) {
        alert("Failed to delete event.");
        return;
      }
      SoundManager.playDelete();
      renderUpcomingEvents();
      if (selectedDate) showEvents(selectedDate);

    } catch (err) {
      console.error("Error deleting event:", err);
      alert("An unexpected error occurred while deleting the event.");
    }
  };


  return {
    init,
    renderCalendar,
    changeMonth,
    showEvents,
    getDateKey,
    addEvent,
    renderUpcomingEvents,
    deleteEvent
  };
})();

calendar.init();
window.calendar = calendar;

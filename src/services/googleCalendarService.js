const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

/**
 * Create Google Calendar event with Meet link
 */
exports.createGoogleMeetEvent = async ({ summary, description, attendees, date, time }) => {
  try {
    // Combine date and time
    const [year, month, day] = date.split('-');
    const [hour, minute] = time.split(':');
    const startDateTime = new Date(year, month - 1, day, hour, minute);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour later

    const event = {
      summary,
      description,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'UTC'
      },
      attendees: attendees.map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1
    });

    const meetLink = response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri;
    
    return meetLink || 'https://meet.google.com/placeholder';

  } catch (error) {
    console.error('Google Calendar error:', error);
    return 'https://meet.google.com/placeholder';
  }
};
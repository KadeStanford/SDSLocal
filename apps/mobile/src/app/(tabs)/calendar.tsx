/**
 * Calendar is the customer-facing event view. The screen logic remains shared
 * with Rewards so event reminders and detail handling stay consistent while
 * the navigation model gives the calendar a clear home of its own. The
 * dedicated entry point forces event mode and cannot fall back to wallet state.
 */
import { CalendarScreen } from './rewards';

export default CalendarScreen;

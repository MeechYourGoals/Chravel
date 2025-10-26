/**
 * Section Builder Functions for Trip Export
 *
 * Formats raw database data into structured sections for PDF generation
 */

import {
  TripEvent,
  TripPayment,
  TripPoll,
  TripLink,
  TripTask,
  FormattedCalendarSection,
  FormattedPaymentsSection,
  FormattedPollsSection,
  FormattedPlacesSection,
  FormattedTasksSection,
  PollOption,
} from '@/types/tripExport';

/**
 * Format date to readable string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format time from datetime string
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Build Calendar Section
 */
export function buildCalendarSection(events: TripEvent[]): FormattedCalendarSection {
  // Sort events by start time
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  return {
    type: 'calendar',
    title: 'Calendar',
    icon: '🗓',
    items: sortedEvents.map((event) => ({
      title: event.title,
      date: formatDate(event.start_time),
      time: formatTime(event.start_time),
      location: event.location || undefined,
      description: event.description || undefined,
    })),
  };
}

/**
 * Build Payments Section
 */
export function buildPaymentsSection(payments: TripPayment[]): FormattedPaymentsSection {
  // Sort payments by date (newest first)
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const items = sortedPayments.map((payment) => ({
    description: payment.description,
    amount: formatCurrency(payment.amount, payment.currency),
    currency: payment.currency,
    payer: 'Trip Member', // We don't have user name here, will need to join
    participants: payment.split_count,
    settled: payment.is_settled || false,
    date: formatDate(payment.created_at),
  }));

  // Calculate total
  const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const currency = payments[0]?.currency || 'USD';

  return {
    type: 'payments',
    title: 'Payments',
    icon: '💸',
    items,
    totalAmount: formatCurrency(total, currency),
  };
}

/**
 * Build Polls Section
 */
export function buildPollsSection(polls: TripPoll[]): FormattedPollsSection {
  // Sort polls by date (newest first)
  const sortedPolls = [...polls].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return {
    type: 'polls',
    title: 'Polls',
    icon: '📊',
    items: sortedPolls.map((poll) => {
      const options = (poll.options as unknown as PollOption[]) || [];
      const totalVotes = poll.total_votes;

      const formattedOptions = options.map((option) => ({
        text: option.text,
        votes: option.votes || 0,
        percentage: totalVotes > 0 ? Math.round(((option.votes || 0) / totalVotes) * 100) : 0,
      }));

      // Find winner (option with most votes)
      const winner = formattedOptions.reduce((max, opt) =>
        opt.votes > max.votes ? opt : max,
        formattedOptions[0]
      );

      return {
        question: poll.question,
        options: formattedOptions,
        totalVotes,
        status: poll.status,
        winner: winner?.text,
      };
    }),
  };
}

/**
 * Build Places Section
 */
export function buildPlacesSection(links: TripLink[]): FormattedPlacesSection {
  // Sort by votes (highest first)
  const sortedLinks = [...links].sort((a, b) => b.votes - a.votes);

  return {
    type: 'places',
    title: 'Places',
    icon: '📍',
    items: sortedLinks.map((link) => ({
      name: link.title,
      url: link.url,
      description: link.description || undefined,
      category: link.category || undefined,
      votes: link.votes,
    })),
  };
}

/**
 * Build Tasks Section
 */
export function buildTasksSection(tasks: TripTask[]): FormattedTasksSection {
  // Sort by completion status (incomplete first), then by due date
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    if (a.due_at && b.due_at) {
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    }
    return 0;
  });

  const items = sortedTasks.map((task) => ({
    title: task.title,
    description: task.description || undefined,
    completed: task.completed,
    dueDate: task.due_at ? formatDate(task.due_at) : undefined,
    completedDate: task.completed_at ? formatDate(task.completed_at) : undefined,
  }));

  const completed = tasks.filter((t) => t.completed).length;
  const pending = tasks.length - completed;

  return {
    type: 'tasks',
    title: 'Tasks',
    icon: '✅',
    items,
    stats: {
      total: tasks.length,
      completed,
      pending,
    },
  };
}

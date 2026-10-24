import { useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Plus,
} from "lucide-react";

type Transaction = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  category: string;
  description?: string;
  transactionDate: string;
};

type Props = {
  month: string;
  transactions: Transaction[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onMonthChange: (month: string) => void;
  onAddTransaction: () => void;
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function localToday() {
  const date = new Date();

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function TransactionCalendar({
  month,
  transactions,
  selectedDate,
  onSelectDate,
  onMonthChange,
  onAddTransaction,
}: Props) {
  const today = localToday();

  const { days, monthLabel } = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);

    if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) {
      return { days: [], monthLabel: month };
    }

    const firstDay = new Date(year, monthNumber - 1, 1);
    const totalDays = new Date(year, monthNumber, 0).getDate();

    // Convert Sunday-first JavaScript indexing to Monday-first calendar.
    const leadingEmptyDays = (firstDay.getDay() + 6) % 7;

    const calendarDays: Array<{
      date: string;
      day: number;
    } | null> = [];

    for (let i = 0; i < leadingEmptyDays; i++) {
      calendarDays.push(null);
    }

    for (let day = 1; day <= totalDays; day++) {
      calendarDays.push({
        date: `${year}-${String(monthNumber).padStart(2, "0")}-${String(
          day,
        ).padStart(2, "0")}`,
        day,
      });
    }

    return {
      days: calendarDays,
      monthLabel: firstDay.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      }),
    };
  }, [month]);

  const activityByDate = useMemo(() => {
    const result = new Map<
      string,
      { income: number; expenses: number; count: number }
    >();

    for (const transaction of transactions) {
      const date = transaction.transactionDate?.slice(0, 10);
      if (!date) continue;

      const activity = result.get(date) ?? {
        income: 0,
        expenses: 0,
        count: 0,
      };

      const amount = Number(transaction.amount) || 0;

      if (transaction.type === "INCOME") {
        activity.income += amount;
      } else {
        activity.expenses += amount;
      }

      activity.count += 1;
      result.set(date, activity);
    }

    return result;
  }, [transactions]);

  const selectedActivity = activityByDate.get(selectedDate);
  const selectedTransactions = transactions.filter(
    (transaction) =>
      transaction.transactionDate?.slice(0, 10) === selectedDate,
  );

  function changeMonth(offset: number) {
    const [year, monthNumber] = month.split("-").map(Number);
    const next = new Date(year, monthNumber - 1 + offset, 1);

    const nextMonth = `${next.getFullYear()}-${String(
      next.getMonth() + 1,
    ).padStart(2, "0")}`;

    onMonthChange(nextMonth);

    // Keep the same day where possible, otherwise use the final day of
    // the destination month.
    const oldDay = Number(selectedDate.slice(8, 10)) || 1;
    const lastDay = new Date(
      next.getFullYear(),
      next.getMonth() + 1,
      0,
    ).getDate();

    const nextDay = Math.min(oldDay, lastDay);

    onSelectDate(
      `${nextMonth}-${String(nextDay).padStart(2, "0")}`,
    );
  }

  function goToToday() {
    const todayMonth = today.slice(0, 7);

    onMonthChange(todayMonth);
    onSelectDate(today);
  }

  return (
    <section className="panel calendar-panel" aria-label="Transaction calendar">
      <div className="calendar-heading">
        <div>
          <span className="chart-kicker">
            <CalendarDays size={15} /> DAILY ACTIVITY
          </span>
          <h2>Transaction calendar</h2>
          <p>Find missing entries and review your spending day by day.</p>
        </div>

        <button
          type="button"
          className="calendar-today-button"
          onClick={goToToday}
        >
          Today
        </button>
      </div>

      <div className="calendar-month-navigation">
        <button
          type="button"
          className="calendar-nav-button"
          onClick={() => changeMonth(-1)}
          aria-label="Previous month"
        >
          <ArrowLeft size={17} />
        </button>

        <h3>{monthLabel}</h3>

        <button
          type="button"
          className="calendar-nav-button"
          onClick={() => changeMonth(1)}
          aria-label="Next month"
        >
          <ArrowRight size={17} />
        </button>
      </div>

      <div className="calendar-weekdays" aria-hidden="true">
        {weekdays.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="calendar-days">
        {days.map((calendarDay, index) => {
          if (!calendarDay) {
            return (
              <div
                className="calendar-day calendar-day-empty"
                key={`empty-${index}`}
                aria-hidden="true"
              />
            );
          }

          const activity = activityByDate.get(calendarDay.date);
          const isToday = calendarDay.date === today;
          const isSelected = calendarDay.date === selectedDate;
          const isFuture = calendarDay.date > today;

          return (
            <button
              type="button"
              key={calendarDay.date}
              className={[
                "calendar-day",
                isToday ? "calendar-day-today" : "",
                isSelected ? "calendar-day-selected" : "",
                activity ? "calendar-day-has-activity" : "",
                isFuture ? "calendar-day-future" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelectDate(calendarDay.date)}
              aria-label={`${formatDate(calendarDay.date)}${
                activity
                  ? `, ${activity.count} transaction${activity.count === 1 ? "" : "s"}`
                  : ", no transactions recorded"
              }`}
              aria-pressed={isSelected}
            >
              <span className="calendar-day-number">
                {calendarDay.day}
              </span>

              {activity && (
                <span className="calendar-day-markers" aria-hidden="true">
                  {activity.income > 0 && (
                    <i className="calendar-income-dot" />
                  )}
                  {activity.expenses > 0 && (
                    <i className="calendar-expense-dot" />
                  )}
                </span>
              )}

              {activity && (
                <span className="calendar-day-count">
                  {activity.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="calendar-legend">
        <span><i className="calendar-income-dot" /> Income</span>
        <span><i className="calendar-expense-dot" /> Expenses</span>
        <span><i className="calendar-no-entry-dot" /> No entry</span>
      </div>

      <div className="calendar-selected-day">
        <div className="calendar-selected-day-heading">
          <div>
            <span className="eyebrow">SELECTED DAY</span>
            <h3>{formatDate(selectedDate)}</h3>
          </div>

          <button
            type="button"
            className="button button-primary calendar-add-button"
            onClick={onAddTransaction}
          >
            <Plus size={16} />
            Add transaction
          </button>
        </div>

        {selectedActivity ? (
          <>
            <div className="calendar-day-summary">
              <div>
                <span>Income</span>
                <strong className="calendar-income-text">
                  {formatMoney(selectedActivity.income)}
                </strong>
              </div>

              <div>
                <span>Expenses</span>
                <strong className="calendar-expense-text">
                  {formatMoney(selectedActivity.expenses)}
                </strong>
              </div>

              <div>
                <span>Entries</span>
                <strong>{selectedActivity.count}</strong>
              </div>
            </div>

            <div className="calendar-selected-transactions">
              {selectedTransactions.map((transaction) => (
                <div
                  className="calendar-transaction-row"
                  key={transaction.id}
                >
                  <span
                    className={`calendar-transaction-icon ${
                      transaction.type === "INCOME"
                        ? "calendar-transaction-income"
                        : "calendar-transaction-expense"
                    }`}
                  >
                    {transaction.type === "INCOME" ? (
                      <ArrowLeft size={16} />
                    ) : (
                      <ArrowRight size={16} />
                    )}
                  </span>

                  <span className="calendar-transaction-description">
                    <strong>
                      {transaction.description?.trim() ||
                        transaction.category}
                    </strong>
                    <small>{transaction.category}</small>
                  </span>

                  <strong
                    className={
                      transaction.type === "INCOME"
                        ? "calendar-income-text"
                        : "calendar-expense-text"
                    }
                  >
                    {transaction.type === "INCOME" ? "+" : "−"}
                    {formatMoney(Number(transaction.amount) || 0)}
                  </strong>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="calendar-no-entry">
            <span className="calendar-no-entry-icon">
              <CalendarDays size={20} />
            </span>
            <div>
              <strong>
                {selectedDate > today
                  ? "This day hasn't arrived yet"
                  : "No transactions recorded"}
              </strong>
              <p>
                {selectedDate > today
                  ? "You can add a transaction to this date if needed."
                  : "Forgot to record something? Add it now and choose this date."}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
export const isSessionActive = (day: string, startTime: string, endTime: string): boolean => {
    // Define exact dates for Viernes, Sabado, Domingo (April 2026)
    const dateMap: { [key: string]: string } = {
        'Viernes': '2026-04-10',
        'Sábado': '2026-04-11',
        'Domingo': '2026-04-12',
    };

    const sessionDateStr = dateMap[day];
    if (!sessionDateStr) {
        return false; // Invalid day
    }

    try {
        // 1. Get the current time exactly as it is in Monterrey
        const monterreyString = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Monterrey',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        }).format(new Date());
        // Example format returned: "04/10/2026, 09:30:00"

        const [datePart, timePart] = monterreyString.split(', ');
        const [month, dayStr, year] = datePart.split('/');
        const monterreyISO = `${year}-${month}-${dayStr}T${timePart}-06:00`; // Monterrey is mostly UTC-6

        const now = new Date(monterreyISO);

        // 2. Parse the Session's Start Time and End Time using the mapped date
        const sessionStart = new Date(`${sessionDateStr}T${startTime}:00-06:00`);
        const sessionEnd = new Date(`${sessionDateStr}T${endTime}:00-06:00`);

        // 3. Compare exact start and end time
        return now >= sessionStart && now <= sessionEnd;

    } catch (error) {
        console.error("Time validation error:", error);
        return false;
    }
};

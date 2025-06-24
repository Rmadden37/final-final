# **App Name**: LeadFlow

## Core Features:

- Live Dashboard: Real-time dashboard displaying 'In Process,' 'Closer Lineup,' 'Lead Queue,' and 'Off Duty Closers' sections, updating live without page refreshes.
- Automated Lead Distribution: Automatic lead assignment from the 'Waiting Assignment' queue to the next available closer in the lineup, following a round-robin rotation.
- Availability Toggle: Closer availability toggle to switch between 'Available' and 'Off Duty' status, impacting lineup placement and lead distribution.
- Role-Based Access: Role-based access control restricting data views based on user roles (Setter, Closer, Manager) and teamId, ensuring users only see relevant information.
- Lead Disposition: Lead disposition options for closers to mark leads as 'Sold,' 'No Sale,' 'Canceled,' 'Rescheduled,' or 'Credit Fail,' updating the lead status in real time.
- Secure Authentication: Integration with Firebase Auth for secure user authentication, requiring email/password login, role assignment, and teamId association.

## Style Guidelines:

- Primary color: A calming blue (#4A8FE7) to evoke trust and stability in the solar sales process.
- Background color: A light, neutral gray (#F0F4F8) provides a clean, uncluttered backdrop.
- Accent color: A vibrant green (#50D890) will highlight key actions and statuses.
- Body and headline font: 'Inter', a grotesque-style sans-serif for a clean and modern user experience.
- Simple, clean icons to represent lead status, user roles, and actions within the dashboard.
- Dashboard layout matches the example image including sections for 'In Process,' 'Closer Lineup,' 'Lead Queue,' and 'Off Duty Closers' are clearly separated for easy navigation.
- Subtle transitions and animations to reflect real-time updates and changes in lead status and closer availability.
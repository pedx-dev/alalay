1. System Roles & Credentials

For the prototype phase, the system will bypass a formal login screen and use role-based entry triggers.
Role	Shortcut	Primary Permissions
Admin	@admin	CRUD for Staff, System Logs, Account Locking.
Councilor	@conci	Student Intake, Teacher Assignment, Case Tracking.
Teacher	@edu	Section View, Grade Entry, Student Rosters.
2. Technical Testing Layer: Mock Backend

To facilitate rapid prototyping without a live database, all data operations will target Browser Local Storage.

    Data Persistence: A single JSON object alalay_db will store users, students, and sections.

    The "No-Delete" Logic: The database schema includes a status field.

        ACTIVE: Visible in all dashboards.

        DISABLED: Account locked (Admin only).

        DROPOUT: Historical data kept, removed from Teacher's active Section Cards.

3. UI/UX Architecture
A. Global Navigation (Homepage)

A clean, professional navbar accessible to all users before they "enter" their specific portal.

    Links: Home, About, Features, Contact.

    Portal Entry: A dropdown or button set to select the role (@admin, @edu, @conci).

B. Teacher Dashboard (@edu): The "Drill-Down" Flow

The teacher's interface uses a nested modal system to keep the workspace focused.

    Main View (Section Cards):

        A 4x4 Grid Layout of large cards.

        Each card represents a Section (e.g., BSIT – 3RD YR).

    Level 1 Modal (Student Roster):

        Triggered by clicking a Section Card.

        Displays a list of Student Cards containing:

            Student Image (Placeholder).

            Full Name.

            Student ID Number.

    Level 2 Modal (Grade & Edit):

        Triggered by clicking a specific Student Card.

        Features: Input fields for grades and a "Save" button that pushes updates directly to Local Storage.

C. Student Master Modal (Councilor View)

A tabbed interface for managing the student lifecycle.

    Tab 1: Profile (Bio data).

    Tab 2: Assignment (Dropdown to pick a Teacher and assign a Section).

    Tab 3: Grades (Read-only view of Teacher inputs).

    Tab 4: Logs (Disciplinary history).

4. Key Logical Workflows
The Assignment Sync

When the Councilor assigns a Teacher to a Student in the Assignment Tab, that student's ID is added to the Teacher’s specific section array. The Teacher’s dashboard reflects this change immediately upon the next page refresh (reading from Local Storage).
Real-time Grade Visibility

Because both the Teacher and Councilor read from the same students array in Local Storage, any grade saved by the Teacher is instantly "synced" for the Councilor to view in the Grades Tab.
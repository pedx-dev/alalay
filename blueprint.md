BLUEPRINT SA PROJECT 


1. System Roles & Permissions
Define these three distinct access levels to ensure data integrity.
Admin (Super User)
•	Account Management: Perform CRUD (Create, Read, Update, Delete) on Guidance Councilor accounts.
•	Student Control: Ability to delete student records.
•	Safety Switch: An option to Disable/Deactivate a student account instead of deleting it (useful for "Drop Out" status to keep historical data).
Guidance Councilor (Main User)
•	Student Management: Add new students and search by ID number.
•	Monitoring: View full student profiles (Address, previous school, background/history).
•	Status Control: Mark a student as "Drop Out."
•	Case Tracking: Manage "Complain Solutions" or disciplinary records.
Teacher
•	Grade Entry: Restricted access to input and update grades for their specific students.
•	Data Sync: Grades entered here must automatically reflect in the Guidance Councilor's student view.




2. The "Student Master" Modal
When a Councilor or Admin searches for a student and clicks their record, a modal should pop up. To keep it clean, use a Tabbed Navigation (Navbar-style) inside the modal.
Tab Name	Data Fields / Functionality
Information	Full Name, ID Number, Address, Contact Info, Previous School, and "Reason for Enrollment/Background."
Grades	A table showing grades from 1st Year up to the Current Year. (Data pulled from Teacher inputs).
Guidance Info	Disciplinary history, "Guidance History" (logs of previous visits), and the "Complain Solution" records.


3. Key Logical Workflows
The Search Logic
1.	User enters Student ID in the search bar.
2.	System fetches the record.
3.	Result: The "Student Master Modal" opens directly to the Information tab.
The "Drop Out" Logic
•	Instead of a hard DELETE from the database, use a status column.
•	If status == "Drop Out", the student is "disabled" from active lists but their Guidance History remains searchable for legal or record-keeping purposes.
The Grade Integration
•	The Grades Tab in the modal is "Read-Only" for the Councilor.
•	It should dynamically fetch the latest data from the Grades table populated by the Teacher accounts.


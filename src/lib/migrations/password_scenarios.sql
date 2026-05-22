-- 1. Create the Password Scenarios Table
CREATE TABLE IF NOT EXISTS password_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  bio TEXT,
  posts TEXT[],
  correct_password TEXT NOT NULL,
  vulnerabilities TEXT[],
  difficulty TEXT DEFAULT 'Beginner',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Seed with initial training data
INSERT INTO password_scenarios (name, bio, posts, correct_password, vulnerabilities, difficulty) VALUES
-- BEGINNER (Obvious combinations of pets, years, hometowns)
(
  'John Doe', 
  'System Admin. Class of 1985. Lifelong Lakers fan. 🏀', 
  ARRAY['"Happy 10th birthday to my dog Buster! 🐶"', '"Can''t wait for the game tonight!"'], 
  'Buster1985', 
  ARRAY['Buster', '1985', 'Lakers'],
  'Beginner'
),
(
  'Emma Watson', 
  'Teacher from Chicago. Born 1990.', 
  ARRAY['"I love my cat Whiskers! 🐱"', '"Chicago winters are too cold."'], 
  'Whiskers1990', 
  ARRAY['Whiskers', '1990', 'Chicago'],
  'Beginner'
),
(
  'Michael Smith', 
  'Plumber. Proud dad of 3. Married in 2012.', 
  ARRAY['"My son Max just won his soccer game! ⚽"', '"Celebrating my anniversary today."'], 
  'Max2012', 
  ARRAY['Max', '2012', 'Soccer'],
  'Beginner'
),
(
  'Jessica Jones', 
  'Freelance Photographer based in NY. Born in 1995.', 
  ARRAY['"Just bought a new Nikon camera! 📷"', '"Hanging out with my dog Rocky."'], 
  'Rocky1995', 
  ARRAY['Rocky', '1995', 'Nikon'],
  'Beginner'
),
(
  'Chris Evans', 
  'Accountant. Huge fan of Star Wars. Born 1988.', 
  ARRAY['"May the force be with you! 🌌"', '"Taking my dog Yoda for a walk."'], 
  'Yoda1988', 
  ARRAY['Yoda', '1988', 'StarWars'],
  'Beginner'
),

-- INTERMEDIATE (Requires combining hobbies, partners, or slightly obscured info)
(
  'Sarah Miller', 
  'Marketing Director. Seattle native. 🌧️ Coffee enthusiast.', 
  ARRAY['"Just adopted Luna from the shelter! 🐈"', '"Married my best friend in 2018!"'], 
  'Seattle2018', 
  ARRAY['Seattle', 'Luna', '2018'],
  'Intermediate'
),
(
  'Tom Holland', 
  'Software Engineer. Loves rock climbing. Graduated 2015.', 
  ARRAY['"Just climbed El Capitan! 🧗‍♂️"', '"My girlfriend Mary is the best."'], 
  'Mary2015', 
  ARRAY['Mary', '2015', 'Climbing'],
  'Intermediate'
),
(
  'Olivia Pope', 
  'Lawyer. DC Resident. Married to Fitz.', 
  ARRAY['"Celebrating 10 years of marriage! (2013) 🥂"', '"Love walking my dog Vermont."'], 
  'Vermont2013', 
  ARRAY['Vermont', '2013', 'Fitz'],
  'Intermediate'
),
(
  'Bruce Wayne', 
  'CEO of Wayne Ent. Based in Gotham. Orphaned in 1981.', 
  ARRAY['"Miss you mom and dad... 🦇"', '"Alfred makes the best tea."'], 
  'Alfred1981', 
  ARRAY['Alfred', '1981', 'Gotham'],
  'Intermediate'
),
(
  'Clark Kent', 
  'Journalist at Daily Planet. From Smallville. Met Lois in 2010.', 
  ARRAY['"Great article today by Lois! 📝"', '"Heading back to Smallville for the weekend."'], 
  'Lois2010', 
  ARRAY['Lois', '2010', 'Smallville'],
  'Intermediate'
),
(
  'Diana Prince', 
  'Curator. Antiquities Expert. Moved to London in 1918.', 
  ARRAY['"Fascinating new Greek exhibit! 🏺"', '"Thinking of Steve today. ❤️"'], 
  'Steve1918', 
  ARRAY['Steve', '1918', 'London'],
  'Intermediate'
),

-- ADVANCED (Obscure hobbies, hidden dates, sports teams)
(
  'David Chen', 
  'IT Specialist. Retro gaming collector. Born in 1992.', 
  ARRAY['"Finally finished CyberQuest on Hard mode! 🎮"', '"Missing my cat Zelda today. 🐱"'], 
  'Zelda1992', 
  ARRAY['Zelda', '1992', 'CyberQuest'],
  'Advanced'
),
(
  'Peter Parker', 
  'Student at ESU. Photography nerd. Uncle Ben died in 2014.', 
  ARRAY['"Got a great shot of the city today! 🕷️"', '"Aunt May makes the best wheatcakes."'], 
  'May2014', 
  ARRAY['May', '2014', 'Photography'],
  'Advanced'
),
(
  'Tony Stark', 
  'Inventor. Futurist. Built first suit in 2008.', 
  ARRAY['"Working on the Mark 42! 🤖"', '"Pepper is running the company now."'], 
  'Pepper2008', 
  ARRAY['Pepper', '2008', 'Mark42'],
  'Advanced'
),
(
  'Steve Rogers', 
  'Retired Military. Born in Brooklyn. Woke up in 2011.', 
  ARRAY['"Catching up on pop culture. 🇺🇸"', '"Bucky is still my best friend."'], 
  'Bucky2011', 
  ARRAY['Bucky', '2011', 'Brooklyn'],
  'Advanced'
),
(
  'Natasha Romanoff', 
  'Security Consultant. Former ballerina. Defected in 1998.', 
  ARRAY['"Budapest is beautiful this time of year. 🕷️"', '"Clint always has my back."'], 
  'Clint1998', 
  ARRAY['Clint', '1998', 'Budapest'],
  'Advanced'
),

-- EXPERT (Complex combinations, symbols, obscure references)
(
  'Wanda Maximoff', 
  'Resident of Westview. Loves classic sitcoms. Twins born in 2021.', 
  ARRAY['"Vision is such a great dad! 📺"', '"Billy and Tommy are growing so fast."'], 
  'Vision2021', 
  ARRAY['Vision', '2021', 'Westview'],
  'Expert'
),
(
  'Stephen Strange', 
  'Neurosurgeon. Resides in Greenwich Village. Accident in 2016.', 
  ARRAY['"Wong is always organizing the library! 📚"', '"Christine, I will always love you."'], 
  'Christine2016', 
  ARRAY['Christine', '2016', 'Wong'],
  'Expert'
),
(
  'Carol Danvers', 
  'Pilot. USAF Captain. Left Earth in 1989.', 
  ARRAY['"Monica is the best co-pilot! ✈️"', '"Maria is always there for me."'], 
  'Maria1989', 
  ARRAY['Maria', '1989', 'Monica'],
  'Expert'
),
(
  'Thor Odinson', 
  'Foreign Exchange Student. Loves lightning storms. Arrived in 2011.', 
  ARRAY['"Jane is brilliant! ⚡"', '"Loki is always causing trouble."'], 
  'Jane2011', 
  ARRAY['Jane', '2011', 'Loki'],
  'Expert'
);

-- 3. Enable RLS
ALTER TABLE password_scenarios ENABLE ROW LEVEL SECURITY;

-- 4. Allow public read access (for Academy students)
CREATE POLICY "Allow public read access to scenarios" 
ON password_scenarios FOR SELECT 
USING (true);

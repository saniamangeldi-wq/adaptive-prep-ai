/**
 * ORIGINAL task bank. Every prompt, dataset, diagram and map below was written
 * for AdaptivePrep and is not taken from Cambridge, British Council, IDP or
 * any other published source. Place names (Ardale, Westbrook…) and all
 * figures are invented; data is internally consistent but illustrative, and
 * prompts say "one country" / use invented names so no real-world claim is made.
 * Standard IELTS instruction sentences ("Summarise the information…",
 * "Write at least 150 words.") are generic task wording.
 *
 * Letters: `prompt` ends with "In your letter:" and the UI lists `bullets`
 * right after it; the grader receives the bullets separately.
 *
 * Selection: pickBankTask() — variant filter, excludeIds, random pick; when
 * every matching task has been seen, it starts again from the full pool.
 */

import type {
  DataVisual,
  GetTaskRequest,
  MapVisual,
  ProcessVisual,
  Task1AcademicVariant,
  Task1GeneralVariant,
  Task2Variant,
  TaskType,
  TaskVariant,
  TaskVisual,
  WritingTask,
} from "./contract.ts";
import { TASK_RULES } from "./contract.ts";

// ───────────────────────── builders ─────────────────────────

const T1_DATA_INSTRUCTION =
  "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.";
const T1_PROCESS_INSTRUCTION = "Summarise the information by selecting and reporting the main features.\n\nWrite at least 150 words.";

function academic(id: string, variant: Task1AcademicVariant, topic: string, intro: string, visuals: TaskVisual[], process = false): WritingTask {
  const r = TASK_RULES.task1_academic;
  return {
    id,
    source: "bank",
    taskType: "task1_academic",
    variant,
    prompt: `${intro}\n\n${process ? T1_PROCESS_INSTRUCTION : T1_DATA_INSTRUCTION}`,
    bullets: [],
    visuals,
    topic,
    minWords: r.minWords,
    timeMinutes: r.timeMinutes,
  };
}

function letter(
  id: string,
  variant: Task1GeneralVariant,
  topic: string,
  situation: string,
  recipient: string,
  greeting: string,
  bullets: [string, string, string],
): WritingTask {
  const r = TASK_RULES.task1_general;
  return {
    id,
    source: "bank",
    taskType: "task1_general",
    variant,
    prompt: `${situation}\n\nWrite a letter to ${recipient}. Write at least 150 words. You do NOT need to write any addresses.\n\nBegin your letter as follows:\n\n${greeting}\n\nIn your letter:`,
    bullets,
    visuals: [],
    topic,
    minWords: r.minWords,
    timeMinutes: r.timeMinutes,
  };
}

function essay(id: string, variant: Task2Variant, topic: string, statement: string, question: string): WritingTask {
  const r = TASK_RULES.task2;
  return {
    id,
    source: "bank",
    taskType: "task2",
    variant,
    prompt: `Write about the following topic:\n\n${statement}\n\n${question}\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.`,
    bullets: [],
    visuals: [],
    topic,
    minWords: r.minWords,
    timeMinutes: r.timeMinutes,
  };
}

// ───────────────────────── Academic Task 1 ─────────────────────────

const leisureHours: DataVisual = {
  kind: "line",
  title: "Average weekly hours adults spent on three leisure activities, 2000–2020",
  unit: "hours per week",
  categoryKey: "year",
  series: ["Watching TV", "Using the internet", "Reading"],
  data: [
    { year: "2000", "Watching TV": 18, "Using the internet": 3, Reading: 6 },
    { year: "2004", "Watching TV": 17.5, "Using the internet": 5.5, Reading: 5.8 },
    { year: "2008", "Watching TV": 16, "Using the internet": 9, Reading: 5.5 },
    { year: "2012", "Watching TV": 14, "Using the internet": 13, Reading: 5 },
    { year: "2016", "Watching TV": 12.5, "Using the internet": 17, Reading: 4.6 },
    { year: "2020", "Watching TV": 11, "Using the internet": 21, Reading: 4.4 },
  ],
};

const electricity: DataVisual = {
  kind: "line",
  title: "Electricity generated from coal, gas and solar power in one country, 1995–2025",
  unit: "terawatt hours (TWh)",
  categoryKey: "year",
  series: ["Coal", "Gas", "Solar"],
  data: [
    { year: "1995", Coal: 120, Gas: 40, Solar: 0 },
    { year: "2000", Coal: 128, Gas: 52, Solar: 1 },
    { year: "2005", Coal: 125, Gas: 65, Solar: 2 },
    { year: "2010", Coal: 110, Gas: 78, Solar: 8 },
    { year: "2015", Coal: 85, Gas: 90, Solar: 20 },
    { year: "2020", Coal: 60, Gas: 92, Solar: 38 },
    { year: "2025", Coal: 45, Gas: 88, Solar: 61 },
  ],
};

const recyclingRegions: DataVisual = {
  kind: "bar",
  title: "Percentage of households recycling glass, paper and plastic in four regions, 2023",
  unit: "%",
  categoryKey: "region",
  series: ["Glass", "Paper", "Plastic"],
  data: [
    { region: "North", Glass: 72, Paper: 81, Plastic: 45 },
    { region: "South", Glass: 58, Paper: 66, Plastic: 39 },
    { region: "East", Glass: 85, Paper: 88, Plastic: 62 },
    { region: "West", Glass: 49, Paper: 70, Plastic: 31 },
  ],
};

const intlStudents: DataVisual = {
  kind: "bar",
  title: "International students enrolled at universities in one country by field of study, 2015 and 2024",
  unit: "thousands of students",
  categoryKey: "field",
  series: ["2015", "2024"],
  data: [
    { field: "Engineering", "2015": 24, "2024": 31 },
    { field: "Business", "2015": 38, "2024": 35 },
    { field: "Medicine", "2015": 12, "2024": 18 },
    { field: "Arts", "2015": 9, "2024": 7 },
    { field: "Computing", "2015": 15, "2024": 42 },
  ],
};

const householdBudget: DataVisual = {
  kind: "pie",
  title: "How the average household in one country divided its weekly spending, 1990 and 2020",
  unit: "%",
  categoryKey: "category",
  series: ["1990", "2020"],
  data: [
    { category: "Housing", "1990": 22, "2020": 34 },
    { category: "Food", "1990": 31, "2020": 18 },
    { category: "Transport", "1990": 12, "2020": 15 },
    { category: "Leisure", "1990": 10, "2020": 14 },
    { category: "Clothing", "1990": 14, "2020": 6 },
    { category: "Other", "1990": 11, "2020": 13 },
  ],
};

const libraryReasons: DataVisual = {
  kind: "pie",
  title: "Main reasons people gave for visiting public libraries in one city, 2010 and 2024",
  unit: "%",
  categoryKey: "reason",
  series: ["2010", "2024"],
  data: [
    { reason: "Borrowing books", "2010": 52, "2024": 27 },
    { reason: "Using computers", "2010": 18, "2024": 9 },
    { reason: "Quiet study space", "2010": 12, "2024": 28 },
    { reason: "Events and classes", "2010": 6, "2024": 17 },
    { reason: "Children's activities", "2010": 8, "2024": 13 },
    { reason: "Other", "2010": 4, "2024": 6 },
  ],
};

const rentSalary: DataVisual = {
  kind: "table",
  title: "Average monthly rent for a one-bedroom flat and average monthly salary in five cities, 2014 and 2024",
  unit: "US dollars per month",
  categoryKey: "city",
  series: ["Rent 2014", "Rent 2024", "Salary 2014", "Salary 2024"],
  data: [
    { city: "Ardale", "Rent 2014": 520, "Rent 2024": 890, "Salary 2014": 2100, "Salary 2024": 2600 },
    { city: "Bremton", "Rent 2014": 610, "Rent 2024": 760, "Salary 2014": 2400, "Salary 2024": 3100 },
    { city: "Calloway", "Rent 2014": 380, "Rent 2024": 720, "Salary 2014": 1500, "Salary 2024": 1750 },
    { city: "Dunmore", "Rent 2014": 450, "Rent 2024": 480, "Salary 2014": 1900, "Salary 2024": 2300 },
    { city: "Eastvale", "Rent 2014": 700, "Rent 2024": 1350, "Salary 2014": 2800, "Salary 2024": 3300 },
  ],
};

const commuteByAge: DataVisual = {
  kind: "table",
  title: "How people in three age groups travelled to work in one city, 2024",
  unit: "%",
  categoryKey: "age group",
  series: ["Car", "Bus or train", "Bicycle", "Walking"],
  data: [
    { "age group": "18–29", Car: 28, "Bus or train": 41, Bicycle: 17, Walking: 14 },
    { "age group": "30–49", Car: 52, "Bus or train": 30, Bicycle: 9, Walking: 9 },
    { "age group": "50–64", Car: 61, "Bus or train": 24, Bicycle: 4, Walking: 11 },
  ],
};

const parkVisitors: DataVisual = {
  kind: "line",
  title: "Visitors to Hollin Ridge National Park, 2016–2024",
  unit: "thousands of visitors",
  categoryKey: "year",
  series: ["Visitors"],
  data: [
    { year: "2016", Visitors: 410 },
    { year: "2018", Visitors: 455 },
    { year: "2020", Visitors: 190 },
    { year: "2022", Visitors: 520 },
    { year: "2024", Visitors: 610 },
  ],
};

const parkTransport: DataVisual = {
  kind: "pie",
  title: "How visitors travelled to Hollin Ridge National Park, 2024",
  unit: "%",
  categoryKey: "mode",
  series: ["Share of visitors"],
  data: [
    { mode: "Private car", "Share of visitors": 58 },
    { mode: "Coach tour", "Share of visitors": 17 },
    { mode: "Train and shuttle bus", "Share of visitors": 15 },
    { mode: "Bicycle", "Share of visitors": 6 },
    { mode: "Other", "Share of visitors": 4 },
  ],
};

const waterUseCountries: DataVisual = {
  kind: "bar",
  title: "Average daily household water use per person in four countries, 2023",
  unit: "litres per person per day",
  categoryKey: "country",
  series: ["Water use"],
  data: [
    { country: "Country A", "Water use": 140 },
    { country: "Country B", "Water use": 95 },
    { country: "Country C", "Water use": 210 },
    { country: "Country D", "Water use": 120 },
  ],
};

const waterUseCountryC: DataVisual = {
  kind: "table",
  title: "How household water was used in Country C, 2023",
  unit: "litres per person per day",
  categoryKey: "use",
  series: ["Litres"],
  data: [
    { use: "Shower and bath", Litres: 63 },
    { use: "Toilet", Litres: 52 },
    { use: "Garden", Litres: 37 },
    { use: "Washing machine", Litres: 28 },
    { use: "Kitchen and drinking", Litres: 21 },
    { use: "Other", Litres: 9 },
  ],
};

const glassRecycling: ProcessVisual = {
  kind: "process",
  title: "How used glass bottles are recycled into new bottles",
  cyclic: false,
  steps: [
    { id: "collect", label: "Bottles collected from bottle banks and kerbside bins" },
    { id: "transport", label: "Taken by lorry to a processing plant" },
    { id: "sort", label: "Sorted by colour: clear, green and brown" },
    { id: "wash", label: "Washed; labels and caps removed" },
    { id: "crush", label: "Crushed into small fragments (cullet)" },
    { id: "melt", label: "Melted in a furnace with sand and soda ash", detail: "about 1,500°C" },
    { id: "mould", label: "Molten glass shaped in moulds" },
    { id: "cool", label: "Bottles cooled slowly and checked for faults" },
    { id: "deliver", label: "Delivered to drinks companies for filling" },
  ],
};

const seaTurtle: ProcessVisual = {
  kind: "process",
  title: "The life cycle of a sea turtle",
  cyclic: true,
  steps: [
    { id: "nest", label: "Adult female returns to the beach where she hatched" },
    { id: "eggs", label: "Lays about 100 eggs in a hole in the sand" },
    { id: "incubate", label: "Eggs incubate in the warm sand", detail: "about 60 days" },
    { id: "hatch", label: "Hatchlings emerge at night and crawl to the sea" },
    { id: "drift", label: "Juveniles drift with ocean currents in open water", detail: "several years" },
    { id: "coast", label: "Young turtles settle in coastal feeding grounds" },
    { id: "mature", label: "Reach adulthood", detail: "20–30 years" },
    { id: "mate", label: "Migrate to breeding areas and mate offshore" },
  ],
};

const westbrook: MapVisual = {
  kind: "map",
  title: "The village of Westbrook in 2000 and today",
  panels: [
    {
      label: "2000",
      features: [
        { id: "road", label: "Main road", type: "road", x: 0, y: 45, w: 100, h: 6 },
        { id: "river", label: "River", type: "water", x: 0, y: 86, w: 100, h: 10 },
        { id: "forest", label: "Forest", type: "green", x: 0, y: 0, w: 35, h: 40 },
        { id: "farmland", label: "Farmland", type: "farmland", x: 55, y: 0, w: 45, h: 40 },
        { id: "houses", label: "Houses", type: "housing", x: 38, y: 56, w: 20, h: 15 },
        { id: "school", label: "Primary school", type: "building", x: 65, y: 56, w: 12, h: 10 },
        { id: "shop", label: "Village shop", type: "building", x: 38, y: 28, w: 8, h: 10 },
      ],
    },
    {
      label: "Today",
      features: [
        { id: "road", label: "Main road", type: "road", x: 0, y: 45, w: 100, h: 6 },
        { id: "river", label: "River", type: "water", x: 0, y: 86, w: 100, h: 10 },
        { id: "forest", label: "Forest", type: "green", x: 0, y: 0, w: 20, h: 40 },
        { id: "park", label: "Park and playground", type: "green", x: 20, y: 0, w: 15, h: 40 },
        { id: "estate", label: "Housing estate", type: "housing", x: 55, y: 0, w: 45, h: 40 },
        { id: "houses", label: "Houses", type: "housing", x: 38, y: 56, w: 20, h: 15 },
        { id: "school", label: "Primary school (extended)", type: "building", x: 65, y: 56, w: 20, h: 12 },
        { id: "supermarket", label: "Supermarket", type: "building", x: 36, y: 28, w: 10, h: 12 },
        { id: "carpark", label: "Car park", type: "parking", x: 47, y: 28, w: 7, h: 12 },
        { id: "cyclepath", label: "Cycle path", type: "path", x: 0, y: 81, w: 100, h: 3 },
        { id: "bridge", label: "Footbridge", type: "path", x: 45, y: 81, w: 4, h: 17 },
      ],
    },
  ],
};

const harbour: MapVisual = {
  kind: "map",
  title: "The harbour district of Port Elden in 1990 and after redevelopment in 2025",
  panels: [
    {
      label: "1990",
      features: [
        { id: "harbour", label: "Harbour", type: "water", x: 0, y: 0, w: 30, h: 100 },
        { id: "wh1", label: "Warehouse", type: "industry", x: 35, y: 5, w: 15, h: 15 },
        { id: "wh2", label: "Warehouse", type: "industry", x: 35, y: 25, w: 15, h: 15 },
        { id: "wh3", label: "Warehouse", type: "industry", x: 35, y: 45, w: 15, h: 15 },
        { id: "factory", label: "Fish-processing factory", type: "industry", x: 60, y: 10, w: 30, h: 35 },
        { id: "railway", label: "Railway line", type: "other", x: 55, y: 55, w: 45, h: 4 },
        { id: "road", label: "Dock road", type: "road", x: 31, y: 65, w: 69, h: 6 },
        { id: "parking", label: "Car park", type: "parking", x: 60, y: 78, w: 15, h: 12 },
      ],
    },
    {
      label: "2025",
      features: [
        { id: "harbour", label: "Harbour", type: "water", x: 0, y: 0, w: 30, h: 100 },
        { id: "marina", label: "Marina for small boats", type: "other", x: 18, y: 30, w: 12, h: 25 },
        { id: "apts1", label: "Apartments", type: "housing", x: 35, y: 5, w: 15, h: 15 },
        { id: "apts2", label: "Apartments", type: "housing", x: 35, y: 25, w: 15, h: 15 },
        { id: "food", label: "Restaurants and cafés", type: "building", x: 35, y: 45, w: 15, h: 15 },
        { id: "park", label: "Waterfront park", type: "green", x: 60, y: 10, w: 30, h: 35 },
        { id: "path", label: "Walking and cycling path", type: "path", x: 55, y: 55, w: 45, h: 4 },
        { id: "road", label: "Dock road", type: "road", x: 31, y: 65, w: 69, h: 6 },
        { id: "parking", label: "Car park (enlarged)", type: "parking", x: 55, y: 75, w: 22, h: 18 },
        { id: "hotel", label: "Hotel", type: "building", x: 80, y: 75, w: 15, h: 18 },
      ],
    },
  ],
};

const ACADEMIC_TASKS: WritingTask[] = [
  academic("ac-line-01", "line_graph", "leisure and media", "The line graph below shows the average number of hours per week that adults in one country spent on three leisure activities between 2000 and 2020.", [leisureHours]),
  academic("ac-line-02", "line_graph", "energy", "The graph below shows the amount of electricity generated from coal, gas and solar power in one country between 1995 and 2025.", [electricity]),
  academic("ac-bar-01", "bar_chart", "environment", "The bar chart below shows the percentage of households in four regions of a country that recycled glass, paper and plastic in 2023.", [recyclingRegions]),
  academic("ac-bar-02", "bar_chart", "education", "The chart below shows the number of international students studying five subjects at universities in one country in 2015 and 2024.", [intlStudents]),
  academic("ac-pie-01", "pie_chart", "household spending", "The pie charts below show how the average household in one country divided its weekly spending between six categories in 1990 and 2020.", [householdBudget]),
  academic("ac-pie-02", "pie_chart", "libraries", "The pie charts below show the main reasons people gave for visiting public libraries in one city in 2010 and 2024.", [libraryReasons]),
  academic("ac-table-01", "table", "housing costs", "The table below shows the average monthly rent for a one-bedroom flat and the average monthly salary in five cities in 2014 and 2024.", [rentSalary]),
  academic("ac-table-02", "table", "transport", "The table below shows how people in three age groups travelled to work in one city in 2024.", [commuteByAge]),
  academic("ac-mixed-01", "mixed", "tourism", "The line graph below shows the number of visitors to a national park between 2016 and 2024, and the pie chart shows how visitors travelled to the park in 2024.", [parkVisitors, parkTransport]),
  academic("ac-mixed-02", "mixed", "water", "The bar chart below shows average daily household water use per person in four countries in 2023, and the table shows how household water was used in Country C in the same year.", [waterUseCountries, waterUseCountryC]),
  academic("ac-process-01", "process", "recycling", "The diagram below shows how used glass bottles are recycled to make new bottles.", [glassRecycling], true),
  academic("ac-process-02", "process", "nature", "The diagram below shows the life cycle of a sea turtle.", [seaTurtle], true),
  academic("ac-map-01", "map", "town development", "The maps below show the village of Westbrook in 2000 and today.", [westbrook]),
  academic("ac-map-02", "map", "urban redevelopment", "The maps below show the harbour district of a coastal town in 1990 and after it was redeveloped in 2025.", [harbour]),
];

// ───────────────────────── General Training Task 1 (letters) ─────────────────────────

const LETTER_TASKS: WritingTask[] = [
  letter(
    "gt-formal-01",
    "letter_formal",
    "shopping and services",
    "You recently ordered a desk from an online furniture shop. It arrived two weeks late and was damaged.",
    "the customer service manager",
    "Dear Sir or Madam,",
    ["describe what you ordered and what was wrong when it arrived", "explain how this has caused problems for you", "say what you would like the company to do"],
  ),
  letter(
    "gt-formal-02",
    "letter_formal",
    "local community",
    "Your local council is planning to close the public swimming pool in your area to save money.",
    "the council",
    "Dear Sir or Madam,",
    ["explain how you and other local people use the pool", "describe what the effects of closing it would be", "suggest another way the council could save money"],
  ),
  letter(
    "gt-formal-03",
    "letter_formal",
    "work and volunteering",
    "You have seen an advertisement asking for volunteers to help at an international film festival in your city.",
    "the festival organisers",
    "Dear Sir or Madam,",
    ["say why you are interested in volunteering at the festival", "describe the skills and experience you could bring", "explain when you are available and any questions you have"],
  ),
  letter(
    "gt-semi-01",
    "letter_semi_formal",
    "work",
    "You would like to change your working hours for the next three months.",
    "your manager",
    "Dear Mr Lee,",
    ["explain why you need to change your hours", "describe the hours you would like to work", "say how you will make sure your work is not affected"],
  ),
  letter(
    "gt-semi-02",
    "letter_semi_formal",
    "neighbours",
    "Your neighbour has started building work on their house, and the noise early in the morning is causing you problems.",
    "your neighbour",
    "Dear Mrs Ortega,",
    ["explain what problems the noise is causing you", "suggest a solution that would work for both of you", "invite your neighbour to discuss the situation"],
  ),
  letter(
    "gt-semi-03",
    "letter_semi_formal",
    "education",
    "You recently attended a weekend photography course run by a local teacher.",
    "the teacher",
    "Dear Mr Hale,",
    ["thank the teacher and say what you enjoyed most", "explain how you have used what you learned since the course", "ask about a more advanced course"],
  ),
  letter(
    "gt-informal-01",
    "letter_informal",
    "friends and travel",
    "A friend who lives in another country is coming to stay with you for a week next month.",
    "your friend",
    "Dear ……………,",
    ["say how you feel about the visit", "suggest some things you could do together", "give advice about what your friend should bring"],
  ),
  letter(
    "gt-informal-02",
    "letter_informal",
    "friends",
    "You were invited to a friend's birthday party last weekend, but you could not go.",
    "your friend",
    "Dear ……………,",
    ["apologise and explain why you could not go", "ask about the party", "suggest a way to celebrate together soon"],
  ),
  letter(
    "gt-informal-03",
    "letter_informal",
    "home",
    "You have recently moved into a new flat in a different part of your city.",
    "a friend",
    "Dear ……………,",
    ["describe your new flat", "explain what you like about the area", "invite your friend to visit and suggest a date"],
  ),
];

// ───────────────────────── Task 2 ─────────────────────────

const TASK2_TASKS: WritingTask[] = [
  // opinion
  essay("t2-opinion-01", "opinion", "transport", "In several cities, private cars are now banned from the centre on certain days of the week. Some people think this should become a permanent rule in every large city.", "To what extent do you agree or disagree?"),
  essay("t2-opinion-02", "opinion", "work", "Some employers now choose new staff mainly on the results of short online skills tests rather than on school or university qualifications.", "To what extent do you agree or disagree that this is a fairer way to hire people?"),
  essay("t2-opinion-03", "opinion", "children and technology", "It is sometimes argued that children under the age of twelve should not be allowed to own a smartphone.", "To what extent do you agree or disagree?"),
  essay("t2-opinion-04", "opinion", "culture", "Some people say that a town's culture budget should be spent on modern community spaces rather than on preserving old buildings.", "To what extent do you agree or disagree?"),
  // discussion
  essay("t2-discussion-01", "discussion", "young people", "Some people think that young people should spend a year doing community service after they finish school. Others believe this year is better spent studying or working.", "Discuss both these views and give your own opinion."),
  essay("t2-discussion-02", "discussion", "museums", "Some people believe that museums should be free for everyone to enter. Others think visitors should pay to help cover the cost of running them.", "Discuss both these views and give your own opinion."),
  essay("t2-discussion-03", "discussion", "education", "Some people believe that learning online will eventually replace classroom teaching. Others think that face-to-face teaching will always be necessary.", "Discuss both these views and give your own opinion."),
  essay("t2-discussion-04", "discussion", "environment", "Some people say that the best way to reduce packaging waste is for governments to tax it heavily. Others argue that consumers themselves must change the way they shop.", "Discuss both these views and give your own opinion."),
  // advantages / disadvantages
  essay("t2-advdis-01", "advantages_disadvantages", "work", "More companies are now offering their staff a four-day working week in exchange for slightly lower pay.", "Do the advantages of this outweigh the disadvantages?"),
  essay("t2-advdis-02", "advantages_disadvantages", "education", "Many students now take a year off between finishing school and starting university, to travel or to work.", "What are the advantages and disadvantages of this?"),
  essay("t2-advdis-03", "advantages_disadvantages", "technology", "In many supermarkets, cashiers are being replaced by self-service checkouts.", "Do the advantages of this development outweigh the disadvantages?"),
  essay("t2-advdis-04", "advantages_disadvantages", "lifestyle", "Some families choose to live in the countryside and travel long distances every day to work in the city.", "What are the advantages and disadvantages of this way of life?"),
  // problem / solution (incl. causes + effects)
  essay("t2-probsol-01", "problem_solution", "housing", "In many cities, young adults cannot afford to rent a home of their own.", "What are the causes of this problem, and what measures could be taken to solve it?"),
  essay("t2-probsol-02", "problem_solution", "health", "Many people now spend several hours every evening looking at screens, and this is affecting their sleep.", "Why is this happening? What can be done to address the problem?"),
  essay("t2-probsol-03", "problem_solution", "cities", "Noise from traffic and construction in cities is increasing.", "What problems does this cause for people who live in cities, and what solutions can you suggest?"),
  essay("t2-probsol-04", "problem_solution", "rural life", "In some rural regions, young people are moving away and villages are losing their populations.", "What are the causes of this, and what effects does it have on the people who remain?"),
  // two-part
  essay("t2-twopart-01", "two_part", "consumer habits", "These days, many people choose to buy second-hand clothes instead of new ones.", "Why do you think this is happening? Is it a trend that should be encouraged?"),
  essay("t2-twopart-02", "two_part", "food", "Some people rarely cook at home and rely on ready meals and food delivery instead.", "Why do people choose to eat this way? What effect does it have on family life?"),
  essay("t2-twopart-03", "two_part", "hobbies", "More adults are taking up new hobbies, such as learning a musical instrument or a new sport, later in life.", "Why do people do this? How can society benefit from it?"),
  essay("t2-twopart-04", "two_part", "media", "In many countries, fewer people read printed newspapers than at any time in the past.", "What are the reasons for this? How will this change the way people receive news in the future?"),
  // positive / negative
  essay("t2-posneg-01", "positive_negative", "family", "In many countries, people are getting married and starting families later in life than in the past.", "Is this a positive or negative development?"),
  essay("t2-posneg-02", "positive_negative", "money", "More and more shops and cafés accept only card or phone payments and no longer take cash.", "Is this a positive or negative development?"),
  essay("t2-posneg-03", "positive_negative", "languages", "Increasingly, people use translation apps on their phones instead of learning foreign languages.", "Do you think this is a positive or negative development?"),
  essay("t2-posneg-04", "positive_negative", "work", "Many companies now use software to monitor how employees who work from home spend their time online.", "Is this a positive or negative development?"),
];

export const TASK_BANK: readonly WritingTask[] = [...ACADEMIC_TASKS, ...LETTER_TASKS, ...TASK2_TASKS];

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

export function getBankTask(id: string): WritingTask | null {
  const t = TASK_BANK.find((x) => x.id === id);
  return t ? clone(t) : null;
}

export function bankTasksFor(taskType: TaskType, variant?: TaskVariant): WritingTask[] {
  return TASK_BANK.filter((t) => t.taskType === taskType && (!variant || t.variant === variant)).map(clone);
}

/**
 * Pick a task for a GetTaskRequest: filter by task type and variant, prefer
 * tasks not in excludeIds, prefer a topic match if a topic was given, then
 * random. When every matching task has been seen, picks from the full pool
 * again rather than failing. Returns null only if nothing matches at all
 * (an invalid variant for the task type).
 */
export function pickBankTask(req: Pick<GetTaskRequest, "taskType" | "variant" | "excludeIds" | "topic">, random: () => number = Math.random): WritingTask | null {
  const pool = bankTasksFor(req.taskType, req.variant);
  if (pool.length === 0) return null;
  const exclude = new Set(req.excludeIds ?? []);
  let candidates = pool.filter((t) => !exclude.has(t.id));
  if (candidates.length === 0) candidates = pool;
  const topic = req.topic?.trim().toLowerCase();
  if (topic) {
    const matches = candidates.filter((t) => (t.topic ?? "").toLowerCase().includes(topic) || t.prompt.toLowerCase().includes(topic));
    if (matches.length) candidates = matches;
  }
  const idx = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
  return candidates[idx];
}

/* BDL QUIZ QUESTIONS 51-65 */

if (typeof questions !== "undefined" && Array.isArray(questions)) {
  questions.splice(
    35,
    1,
    {
      question:
        "Who is Dr Toño?",
      answers:[
        "A dentist, Golu's father, and married to Leticia",
        "A veterinarian, Moly's father, and married to Amy",
        "A general practitioner, Raka's father, and married to Babs",
        "A surgeon, Kaju's father, and married to Cassandra"
      ],
      correct:0
    },
    {
      question:
        "What is BDL short for?",
      answers:[
        "Budu Dudu Lowlife",
        "Bubble Dubble Lies",
        "Bubu Dudu Lublife",
        "Babs Dad Lilly"
      ],
      correct:2
    },
    {
      question:
        "There is a sign above the door of the Astronomy Club. What is written on it?",
      answers:[
        "To the stars and beyond!",
        "A-11",
        "The galaxy awaits!",
        "A-12"
      ],
      correct:3
    },
    {
      question:
        "Amy gave Moly something to drink. What was it?",
      answers:[
        "A can of soda",
        "A carton of juice",
        "A bottle of water",
        "A glass of milk"
      ],
      correct:1
    },
    {
      question:
        "What colour are Golu's trousers?",
      answers:[
        "Green",
        "Blue",
        "Red",
        "Yellow"
      ],
      correct:2
    },
    {
      question:
        "What is Pecco known for?",
      answers:[
        "Pizza",
        "Bread",
        "Clothes",
        "Meat"
      ],
      correct:0
    },
    {
      question:
        "What colour is Bubu's T-shirt?",
      answers:[
        "Red",
        "Yellow",
        "Purple",
        "Bubu doesn't wear a T-shirt"
      ],
      correct:3
    },
    {
      question:
        "The Slums were given a new name after the construction project. What were they renamed?",
      answers:[
        "BDL Colony",
        "BDL Hope Homes",
        "BDL Poverty Lane",
        "BDL Blessing Homes"
      ],
      correct:3
    },
    {
      question:
        "When Max went for school admission, he was denied. Who did NOT go to the principal to ask for Max's admission?",
      answers:[
        "Dudu",
        "Mr. Richard",
        "Ritchie Richard",
        "Alec"
      ],
      correct:2
    },
    {
      question:
        "In Turkey, the snacks were divided fairly. How many boxes of chops did Max and Moly get?",
      answers:[
        "Max 3 boxes and Moly 2",
        "Max 2 boxes and Moly 3",
        "Max 1 box and Moly 4",
        "Max 4 boxes and Moly 1"
      ],
      correct:1
    },
    {
      question:
        "Why is Amy no longer allowed to see Moly according to André?",
      answers:[
        "She hits him",
        "She spoils him",
        "She ignores him",
        "She scares him"
      ],
      correct:1
    },
    {
      question:
        "Who is currently pregnant?",
      answers:[
        "Leticia",
        "Mona",
        "Chad",
        "Babs"
      ],
      correct:0
    },
    {
      question:
        "Who will help in Dr Toño's household and take care of Golu?",
      answers:[
        "Amy",
        "Leticia",
        "Cassandra",
        "Linda"
      ],
      correct:3
    },
    {
      question:
        "What word describes Minnie best?",
      answers:[
        "Lazy",
        "Dirty",
        "Cute",
        "Angry"
      ],
      correct:2
    },
    {
      question:
        "Who has never given birth?",
      answers:[
        "Leticia",
        "Mona",
        "Masha",
        "Cassandra"
      ],
      correct:3
    }
  );

  if (typeof quizDay === "function" && quizDay() >= 36 && typeof showStartScreen === "function") {
    showStartScreen();
  }
}

export const SEED_STORY = {
  title: 'Kashi Ka Khazana',
  genre: 'Mythology',
  episodes: [
    {
      title: 'Ek Sapna',
      scenes: [
        { img: 'images/webp/ep1-s1.webp',
          hl: 'Vikram raat ke teen baje neend se uth gaya.',
          body: '3:00 AM. The fan was off. The room felt heavier than usual, like someone had been standing at the foot of his bed and just left.' },
        { img: 'images/webp/ep1-s2.webp',
          hl: 'Takiye ke neeche kuch chamak raha tha.',
          body: 'Cold. Round. Heavier than a rupee should ever be. He pulled it out from under his pillow and held it up to the streetlight.' },
        { img: 'images/webp/ep1-s3.webp',
          hl: 'Yeh sona hai. Asli sona.',
          body: 'A gold coin. Ancient script along the rim. A face he half-recognized from a history textbook. And he had absolutely no memory of how it got there.' }
      ],
      choice: {
        q: 'It is 3 AM. The coin is real. What does Vikram do first?',
        A: { text: 'Call Maa', sub: 'She always knows the family stories.', img: 'images/webp/ep1-s3.webp' },
        B: { text: 'Research it alone', sub: 'Don\'t wake anyone. Not yet.', img: 'images/webp/ep1-s3.webp' }
      }
    },
    {
      title: 'Paheli',
      scenes: [
        { img: 'images/webp/ep2-s1.webp',
          hl: 'Maa ne ek purani kahaani sunaayi.',
          body: 'A family legend, three generations old. A great-great-grandfather. A king. A debt that was never repaid. A piece of Kashi that travelled south with the family — and stayed hidden.' },
        { img: 'images/webp/ep2-s1.webp',
          hl: '"Jahan patthar pehli subah ko yaad rakhta hai."',
          body: 'The clue was wrapped in a Sanskrit couplet. "Where stone remembers the first dawn." Vikram opened Google Maps. There was only one place in Bangalore that fit.' },
        { img: 'images/webp/ep2-s3.webp',
          hl: 'Lalbagh ke gate ke saamne, subah ki dhoop.',
          body: 'The gates of Lalbagh Botanical Garden. The same gates kings, hippies and his own grandfather had walked through. He stood there with the coin in his pocket and a feeling that something was watching him back.' }
      ],
      choice: {
        q: 'Lalbagh is a public park by day and a locked garden by night. When does Vikram go in?',
        A: { text: 'Go in daytime', sub: 'Crowds. Safe. Easier to spot clues.', img: 'images/webp/ep2-s3.webp' },
        B: { text: 'Go at night', sub: 'Climb the fence. Some things only show in the dark.', img: 'images/webp/ep2-s3.webp' }
      }
    },
    {
      title: 'Patthar',
      scenes: [
        { img: 'images/webp/ep3-s1.webp',
          hl: 'Teen arab saal purana patthar. Aur woh saans le raha tha.',
          body: 'The Lalbagh peninsular gneiss — three billion years old. Older than oxygen. Older than nearly everything alive. And tonight, it almost seemed to be breathing.' },
        { img: 'images/webp/ep3-s2.webp',
          hl: 'Patthar ke neeche, Sanskrit mein kuch likha tha.',
          body: 'He swept the moss away from the base. The inscription was small, almost shy. A single line of Sanskrit. The same script as the coin.' },
        { img: 'images/webp/ep3-s3.webp',
          hl: 'Yeh akele nahi ho payega.',
          body: 'He sat down on the rock and looked up at the stars. He needed help. Real help. Someone who would not laugh, would not call the police, would not call his mother.' }
      ],
      choice: {
        q: 'Vikram knows one person who might believe him. Priya. Does he tell her?',
        A: { text: 'Tell Priya', sub: 'She\'s a historian. And she trusts him.', img: 'images/webp/ep3-s3.webp' },
        B: { text: 'Keep it secret', sub: 'Some treasures need only one hand.', img: 'images/webp/ep3-s3.webp' }
      }
    },
    {
      title: 'Dalaal',
      scenes: [
        { img: 'images/webp/ep4-s1.webp',
          hl: 'Shekhar ne darwaza khola — jaise Vikram ka intezaar kar raha ho.',
          body: 'Chickpet. A tiny antique shop wedged between a saree wholesaler and a samosa stall. Shekhar looked at the coin once and said, "I knew you would come this week."' },
        { img: 'images/webp/ep4-s2.webp',
          hl: '"Khazana ek Shivalinga hai. Tipu ke mahal ke neeche."',
          body: 'The treasure was not gold. It was a Shivalinga, hidden centuries ago beneath what was now Tipu Sultan\'s summer palace. The gold was just the seal.' },
        { img: 'images/webp/ep4-s3.webp',
          hl: 'Mahal ke peechhe ek puraani seedhi mil gayi.',
          body: 'Behind the palace, in the corner the tourists never reach, the stone steps appeared exactly where Shekhar had said. Narrow. Damp. Going down.' }
      ],
      choice: {
        q: 'Shekhar wants to come with him. Does Vikram trust the dealer?',
        A: { text: 'Trust Shekhar', sub: 'He knew. He always knew.', img: 'images/webp/ep4-s3.webp' },
        B: { text: 'Go alone', sub: 'This belongs to my family, not his.', img: 'images/webp/ep4-s3.webp' }
      }
    },
    {
      title: 'Kamar',
      scenes: [
        { img: 'images/webp/ep5-s1.webp',
          hl: 'Diye sadiyon se jal rahe the. Bina tel ke.',
          body: 'The underground chamber was small and perfectly dry. Lamps along the walls were still burning — and had been, somehow, for hundreds of years. The air smelled of sandalwood.' },
        { img: 'images/webp/ep5-s2.webp',
          hl: 'Beech mein, sone ke sikkon se ghira hua, ek Shivalinga.',
          body: 'On a low stone pedestal, surrounded by a wide ring of gold coins, stood a small black Shivalinga. It was glowing — not brightly, but enough that he could see his own face reflected in it.' },
        { img: 'images/webp/ep5-s3.webp',
          hl: '"Beta, yeh tumhara hai. Lekin tumhari nahi hai."',
          body: 'The voice was inside his head and outside it at the same time. The king from his dream. The final instruction. The choice was now.' }
      ],
      choice: {
        q: 'The Shivalinga is yours by inheritance. But this is where it has lived for 800 years.',
        A: { text: 'Take the idol', sub: 'It\'s my family\'s legacy. Bring it home.', img: 'images/webp/ep5-s3.webp' },
        B: { text: 'Leave the idol', sub: 'Some things should stay where they were born.', img: 'images/webp/ep5-s3.webp' }
      }
    },
    {
      title: 'Varasat',
      scenesA: [
        { img: 'images/webp/ep6-s1a.webp',
          hl: 'Vikram ne Shivalinga uthaya. Kamar sona ban gayi.',
          body: 'The moment his fingers closed around it, every coin in the ring caught fire — not burning, just glowing. The whole chamber turned into one continuous sheet of gold light.' },
        { img: 'images/webp/ep6-s2.webp',
          hl: 'Raja ne sapne mein aakhri baar sar hilaya.',
          body: 'That night he dreamt of the king once more. The king was old, but he was smiling. He nodded once, slowly, and the dream let him go.' },
        { img: 'images/webp/ep6-s2.webp',
          hl: 'Bangalore ki sadkon par Vikram alag tha.',
          body: 'In the morning, traffic was still traffic. Auto-walas still overcharged. But something in his step had changed, and people in the metro kept glancing at him without knowing why.' }
      ],
      scenesB: [
        { img: 'images/webp/ep6-s1b.webp',
          hl: 'Vikram ne ek kadam peechhe liya. Kamar chup ho gayi.',
          body: 'He stepped back. The coins dimmed. The lamps lowered themselves one by one, as if a hundred small breaths had been let go. The chamber sealed behind him without a sound.' },
        { img: 'images/webp/ep6-s2.webp',
          hl: 'Sapne mein raja ki aankh mein aansoo the.',
          body: 'That night the king came one last time. He did not speak. He simply put a hand on Vikram\'s shoulder, and there were tears in his eyes — tears of a man finally allowed to rest.' },
        { img: 'images/webp/ep6-s2.webp',
          hl: 'Khaali haath. Lekin pehle se zyada bhara hua dil.',
          body: 'He walked back to his apartment with empty hands and a chest that felt twice as full. The coin under his pillow was gone. He never told anyone. He did not need to.' }
      ]
    }
  ]
};

export const SEED_CREDIT_MAP = [
  { name: 'VIKRAM',     A: 'called his mother first',    B: 'trusted no one but himself' },
  { name: 'THE STONE',  A: 'found in daylight',          B: 'spoke only in darkness' },
  { name: 'PRIYA',      A: 'stood by him at the end',    B: 'never knew what he found' },
  { name: 'SHEKHAR',    A: 'led the way underground',    B: 'was left behind' },
  { name: 'THE IDOL',   A: 'came home',                  B: 'stayed where it belonged' }
];

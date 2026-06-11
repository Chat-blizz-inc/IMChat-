
export interface RobotUser {
  id: string;
  name: string;
  email: string;
  age: number;
  gender: 'female' | 'male';
  avatar: string;
  status: 'online' | 'offline';
  bio: string;
}

const FEMALE_COMMENTS = [
  "Nice Post thanks for Sharing ♥️🥳",
  "That awesome Post Lol Omg",
  "Gorgeous Gourgous♥️🥳💯💋",
  "that real should be trending post",
  "Nice Snap 💯L♥️V🙉"
];

const MALE_COMMENTS = [
  "Hahaha that Real you thx for Sharing 🤣🤣",
  "Awesome Post Super b🤪",
  "Oh W👀W",
  "Great Puzzle im very interested",
  "Nice Omg 💥💯😎",
  "hey that's Cool buddy 🥸",
  "hey buddy dnt post this Sh** it reminds me my-x 👋"
];

export const ROBOT_USERS: RobotUser[] = [
  {
    id: 'bot_sarah',
    name: 'Sarah Michelle',
    email: 'Sarah1643@verizon.net',
    age: 35,
    gender: 'female',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    status: 'online',
    bio: 'Life is beautiful'
  },
  {
    id: 'bot_emmy',
    name: 'Emmy Carlson',
    email: 'Emmie_Forever97@aol.com',
    age: 28,
    gender: 'female',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    status: 'online',
    bio: 'Music lover'
  },
  {
    id: 'bot_cameron',
    name: 'Cameron Carter',
    email: 'cameron_carter8@outlook.com',
    age: 34,
    gender: 'female',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    status: 'online',
    bio: 'Always exploring'
  },
  {
    id: 'bot_paris',
    name: 'Paris Green',
    email: 'paris_green27@mail.com',
    age: 27,
    gender: 'female',
    avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150',
    status: 'online',
    bio: 'Art is everything'
  },
  {
    id: 'bot_debbie',
    name: 'Debbie White',
    email: 'debbie_white25@gmail.com',
    age: 25,
    gender: 'female',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150',
    status: 'online',
    bio: 'Always smiling'
  },
  {
    id: 'bot_omar',
    name: 'Omar Forest',
    email: 'Mr_Forrest98@live.com',
    age: 24,
    gender: 'male',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    status: 'online',
    bio: 'Hiking and nature'
  },
  {
    id: 'bot_garrett',
    name: 'Garrett Michaels',
    email: 'Garrett89@live.com',
    age: 31,
    gender: 'male',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    status: 'online',
    bio: 'Tech enthusiast'
  },
  {
    id: 'bot_chad',
    name: 'Chad Thompson',
    email: 'Chad89@yahoo.com',
    age: 23,
    gender: 'male',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    status: 'online',
    bio: 'Loves fitness'
  },
  {
    id: 'bot_jamie',
    name: 'Jamie Foster',
    email: 'Jamie94@mail.com',
    age: 26,
    gender: 'male',
    avatar: 'https://images.unsplash.com/photo-1520341280374-49c054701291?w=150',
    status: 'online',
    bio: 'Coffee and code'
  },
  {
    id: 'bot_bryce',
    name: 'Bryce Hamilton',
    email: 'Bryce567@outlook.com',
    age: 19,
    gender: 'male',
    avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=150',
    status: 'online',
    bio: 'Student at life'
  },
  {
    id: 'bot_josh',
    name: 'Josh Nelson',
    email: 'Josh893@outlook.com',
    age: 28,
    gender: 'male',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
    status: 'online',
    bio: 'Just vibing'
  }
];

class RobotStoreClass {
  getBots() {
    return ROBOT_USERS;
  }

  getRandomComment(gender: 'male' | 'female') {
    const list = gender === 'female' ? FEMALE_COMMENTS : MALE_COMMENTS;
    return list[Math.floor(Math.random() * list.length)];
  }

  // Simulate automated interactions
  performAutoInteractions(postId: string, addComment: (postId: string, text: string, user: any) => void, addLike: (postId: string, userId: string) => void) {
    // Random bots react after a short delay
    ROBOT_USERS.forEach((bot, index) => {
      // 70% chance to like
      if (Math.random() > 0.3) {
        setTimeout(() => {
          addLike(postId, bot.id);
        }, 1000 + (index * 500));
      }

      // 40% chance to comment
      if (Math.random() > 0.6) {
        setTimeout(() => {
          addComment(postId, this.getRandomComment(bot.gender), bot);
        }, 3000 + (index * 1000));
      }
    });
  }

  getAutoReply(message: string, botGender: 'male' | 'female') {
    if (message.toLowerCase().includes('hi') || message.toLowerCase().includes('hello')) {
      return "Hi there! How are you today? 😊";
    }
    if (message.toLowerCase().includes('post') || message.toLowerCase().includes('share')) {
      return this.getRandomComment(botGender);
    }
    return botGender === 'female' ? "That's lovely! Tell me more. ✨" : "Cool story bro! 😎";
  }
}

export const RobotStore = new RobotStoreClass();


import { PostStore } from './PostStore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, addDoc, serverTimestamp, query, where, getDocs, setDoc, doc } from 'firebase/firestore';

export interface RobotConfig {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  gender: 'male' | 'female';
  age?: number;
}

export const ROBOTS: RobotConfig[] = [];

class RobotSystem {
  private initialized = false;

  init() {
    // Disabled Robot System
  }

  private monitorIncomingRequests() {
    if (ROBOTS.length === 0) return;
    // Robots auto-accept all requests
    onSnapshot(collection(db, "friendRequests"), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
          const requestData = change.doc.data();
          if (requestData.status === 'pending') {
            const isTargetRobot = ROBOTS.some(r => r.id === requestData.toId);
            if (isTargetRobot) {
              try {
                await setDoc(doc(db, "friendRequests", change.doc.id), { status: 'accepted' }, { merge: true });
                console.log(`Robot auto-accepted friend request from ${requestData.fromName}`);
              } catch (err) {
                console.error('Robot failed to auto-accept request:', err);
              }
            }
          }
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "friendRequests");
    });
  }

  private async monitorNewUsers() {
    if (ROBOTS.length === 0) return;
    // We'll watch the users collection
    onSnapshot(collection(db, "users"), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const userData = change.doc.data();
          const userId = change.doc.id;
          
          const isRobot = ROBOTS.some(r => r.id === userId || r.name === userData.name);
          const isTeam = ['Bill', 'Sean', 'Crystal', 'Amber', 'Lucas', 'Joe'].includes(userData.name);
          
          if (!isRobot && !isTeam && userData.name !== 'IMChat') {
            // New real user detected
            // Robots send friend requests and follow
            ROBOTS.forEach((robot, index) => {
              // Staggered actions for realism
              setTimeout(() => {
                this.sendRobotFriendRequest(robot, userId, userData.name);
                this.robotFollowUser(robot, userId, userData.name);
              }, 2000 + (index * 1500));
            });
          }
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });
  }

  private async robotFollowUser(robot: RobotConfig, targetUserId: string, targetUserName: string) {
    try {
      await addDoc(collection(db, "notifications"), {
        userId: targetUserId,
        type: 'follow',
        fromId: robot.id,
        fromName: robot.name,
        fromAvatar: robot.avatar,
        text: `${robot.name} started following you`,
        timestamp: serverTimestamp(),
        read: false
      });
      console.log(`Robot ${robot.name} followed ${targetUserName}`);
    } catch (err) {
      console.error('Failed robot follow:', err);
    }
  }

  private async sendRobotFriendRequest(robot: RobotConfig, targetUserId: string, targetUserName: string) {
    try {
      const q = query(collection(db, "friendRequests"), 
        where("fromId", "==", robot.id), 
        where("toId", "==", targetUserId));
      
      const existing = await getDocs(q);
      if (existing.empty) {
        await addDoc(collection(db, "friendRequests"), {
          fromId: robot.id,
          fromName: robot.name,
          fromAvatar: robot.avatar,
          toId: targetUserId,
          status: 'pending',
          timestamp: serverTimestamp()
        });
        console.log(`Robot ${robot.name} sent friend request to ${targetUserName}`);
      }
    } catch (err) {
      console.error('Failed to send robot friend request:', err);
    }
  }

  private lastReactedPostId: string | null = null;

  private async autoReactToNewPosts() {
    const posts = PostStore.getPosts();
    if (posts.length === 0) return;

    const latestPost = posts[0];
    
    if (latestPost.id !== this.lastReactedPostId && !latestPost.id.startsWith('seed_') && !ROBOTS.some(r => r.name === latestPost.user.name)) {
      this.lastReactedPostId = latestPost.id;
      
      setTimeout(() => {
        this.performRobotReactions(latestPost);
      }, 5000 + Math.random() * 5000);
    }
  }

  private performRobotReactions(post: any) {
    const maleComments = [
      "Hahaha that Real you thx for Sharing 🤣🤣",
      "Awesome Post Super b🤪",
      "Oh W👀W",
      "Great Puzzle im very interested",
      "Nice Omg 💥💯😎",
      "hey that's Cool buddy 🥸",
      "hey buddy dnt post this Sh** it reminds me my-x 👋"
    ];

    const femaleComments = [
      "Nice Post thanks for Sharing ♥️🥳",
      "That awesome Post Lol Omg",
      "Gorgeous Gourgous♥️🥳💯💋",
      "that real should be trending post",
      "Nice Snap 💯L♥️V🙉"
    ];

    // ALL robots react
    ROBOTS.forEach((robot, index) => {
      setTimeout(() => {
        // Like the post
        PostStore.toggleLike(post.id, robot.name).catch(e => console.error("Robot like fail:", e));

        // Add a comment
        const commentList = robot.gender === 'male' ? maleComments : femaleComments;
        const commentText = commentList[Math.floor(Math.random() * commentList.length)];

        PostStore.addComment(post.id, {
          authorId: robot.id,
          authorName: robot.name,
          avatar: robot.avatar,
          text: commentText
        }).catch(e => console.error("Robot comment fail:", e));
      }, index * 2000 + Math.random() * 2000);
    });
  }

  public getAutoReply(message: string, robot: RobotConfig) {
    const text = message.toLowerCase();
    if (text.includes('hi') || text.includes('hello') || text.includes('hey')) {
      return `Hi ${auth.currentUser?.displayName || 'there'}! Hope you're having an amazing day! 😊✨`;
    }
    
    if (robot.gender === 'female') {
      const femaleReplies = [
        "Nice Post thanks for Sharing ♥️🥳",
        "That awesome Post Lol Omg",
        "Gorgeous Gourgous♥️🥳💯💋",
        "that real should be trending post",
        "Nice Snap 💯L♥️V🙉"
      ];
      return femaleReplies[Math.floor(Math.random() * femaleReplies.length)];
    } else {
      const maleReplies = [
        "Hahaha that Real you thx for Sharing 🤣🤣",
        "Awesome Post Super b🤪",
        "Oh W👀W",
        "Great Puzzle im very interested",
        "Nice Omg 💥💯😎",
        "hey that's Cool buddy 🥸",
        "hey buddy dnt post this Sh** it reminds me my-x 👋"
      ];
      return maleReplies[Math.floor(Math.random() * maleReplies.length)];
    }
  }
}

export const RobotManager = new RobotSystem();

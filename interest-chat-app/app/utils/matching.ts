interface User {
    id: string;
    interests: string[];
    location: string;
  }
  
  export function findMatch(users: User[], currentUser: User): User | undefined {
    return users.find(
      (user) =>
        user.id !== currentUser.id &&
        user.interests.some((interest) => currentUser.interests.includes(interest)) &&
        user.location === currentUser.location
    );
  }
  
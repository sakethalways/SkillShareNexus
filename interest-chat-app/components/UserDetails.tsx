interface User {
  email: string;
  interests: string[];
  location: string;
}

interface UserDetailsProps {
  user: User;
}

export default function UserDetails({ user }: UserDetailsProps) {
  if (!user) {
    return <p className="text-gray-500">No user details available.</p>;
  }

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white">
      <h3 className="text-lg font-semibold mb-2">Matched User</h3>
      <p>
        <strong>Email:</strong> {user.email || "Not provided"}
      </p>
      <p>
        <strong>Interests:</strong>{" "}
        {user.interests.length > 0 ? user.interests.join(", ") : "Not provided"}
      </p>
      <p>
        <strong>Location:</strong> {user.location || "Not provided"}
      </p>
    </div>
  );
}

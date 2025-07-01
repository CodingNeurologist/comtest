import { createContext, useEffect, useState, ReactNode } from "react";
import { User } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, onSnapshot, DocumentData } from "firebase/firestore";

export interface UserProfile extends DocumentData {
    nickname?: string;
    // other fields from survey
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isNewUser: boolean | null;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isNewUser: null,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setLoading(false);
        setUserProfile(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribeSnapshot = onSnapshot(userDocRef, 
        (doc) => {
          if (doc.exists()) {
            setUserProfile(doc.data() as UserProfile);
            // Now we check for nickname to determine if user is new
            if (doc.data().nickname) {
                setIsNewUser(false);
            } else {
                setIsNewUser(true);
            }
          } else {
            setIsNewUser(true);
            setUserProfile(null);
          }
          setLoading(false);
        },
        (error) => {
          console.error("Error listening to user document:", error);
          setLoading(false);
        }
      );

      return () => unsubscribeSnapshot();
    } else {
      setIsNewUser(null);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isNewUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 
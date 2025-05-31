
import { useState } from "react";
import { CircleUser, Briefcase } from "lucide-react";

type UserType = "organizer" | "associate";

interface UserTypeSelectionProps {
  onSelect: (type: UserType) => void;
}

const UserTypeSelection = ({ onSelect }: UserTypeSelectionProps) => {
  const [selectedType, setSelectedType] = useState<UserType | null>(null);

  const handleSelect = (type: UserType) => {
    setSelectedType(type);
    onSelect(type);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium text-center text-foreground">
        Continue as
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => handleSelect("organizer")}
          className={`flex flex-col items-center justify-center p-6 rounded-lg border transition-all duration-200 ${
            selectedType === "organizer"
              ? "border-primary bg-primary-100 shadow-md"
              : "border-border hover:border-primary/30 hover:bg-primary-100/50"
          }`}
        >
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
              selectedType === "organizer"
                ? "bg-primary text-white"
                : "bg-secondary text-primary"
            }`}
          >
            <Briefcase size={28} />
          </div>
          <h3 className="font-medium text-base">Organizer</h3>
          <p className="text-sm text-foreground/60 text-center mt-2">
            Create and manage groups
          </p>
        </button>

        <button
          onClick={() => handleSelect("associate")}
          className={`flex flex-col items-center justify-center p-6 rounded-lg border transition-all duration-200 ${
            selectedType === "associate"
              ? "border-primary bg-primary-100 shadow-md"
              : "border-border hover:border-primary/30 hover:bg-primary-100/50"
          }`}
        >
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
              selectedType === "associate"
                ? "bg-primary text-white"
                : "bg-secondary text-primary"
            }`}
          >
            <CircleUser size={28} />
          </div>
          <h3 className="font-medium text-base">Associate</h3>
          <p className="text-sm text-foreground/60 text-center mt-2">
            Connect to your workspace
          </p>
        </button>
      </div>
    </div>
  );
};

export default UserTypeSelection;

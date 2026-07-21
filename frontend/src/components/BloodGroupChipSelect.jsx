const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function BloodGroupChipSelect({ selected, onChange }) {
  const toggle = (bg) => {
    if (selected.includes(bg)) {
      onChange(selected.filter((g) => g !== bg));
    } else {
      onChange([...selected, bg]);
    }
  };

  return (
    <div className="chip-select">
      {BLOOD_GROUPS.map((bg) => (
        <button
          type="button"
          key={bg}
          className={`chip-toggle ${selected.includes(bg) ? "active" : ""}`}
          onClick={() => toggle(bg)}
        >
          {bg}
        </button>
      ))}
    </div>
  );
}

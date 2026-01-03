"use client";

interface SearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
}

export function SearchFilter({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
}: SearchFilterProps) {
  return (
    <div>
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="記事を検索..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          data-testid="search-input"
        />
      </div>

      <div className="filter-container">
        <button
          className={`filter-button ${selectedCategory === "" ? "active" : ""}`}
          onClick={() => onCategoryChange("")}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            className={`filter-button ${selectedCategory === category ? "active" : ""}`}
            onClick={() => onCategoryChange(category)}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}

export type SourceNode = {
  name: string;
  slug: string;
  relation: string;
  match: string;
  treeGroup?: 'Earlier Generation' | 'Family Sources' | 'Current Generation';
  treeNote?: string;
  primary?: boolean;
  exact?: boolean;
};

export const sourceNodes: SourceNode[] = [
  {
    name: 'Nellie Lustgraaf',
    slug: 'nellie-lustgraaf',
    relation: "Eric Sheridan's great-grandmother",
    match: 'Nellie Lustgraaf',
    treeGroup: 'Earlier Generation',
  },
  {
    name: 'Carol Sheridan',
    slug: 'carol-sheridan',
    relation: "Eric Sheridan's mother",
    match: 'Carol Sheridan',
    treeGroup: 'Family Sources',
    treeNote: 'Family recipes and notes',
  },
  {
    name: 'Jane Burchard',
    slug: 'jane-burchard',
    relation: "Eric Sheridan's grandmother",
    match: 'Jane Burchard',
    treeGroup: 'Family Sources',
  },
  {
    name: 'Bill Burchard',
    slug: 'bill-burchard',
    relation: "Eric Sheridan's grandfather",
    match: 'Bill Burchard',
    treeGroup: 'Family Sources',
  },
  {
    name: 'Aunt Diane',
    slug: 'aunt-diane',
    relation: "Eric Sheridan's aunt",
    match: 'Aunt Diane',
    treeGroup: 'Family Sources',
  },
  {
    name: 'Eric Sheridan',
    slug: 'eric-sheridan',
    relation: 'Cookbook owner and current recipe source',
    match: 'Eric Sheridan',
    treeGroup: 'Current Generation',
    treeNote: 'Cookbook owner',
    primary: true,
    exact: true,
  },
  {
    name: 'Courtney Sheridan',
    slug: 'courtney-sheridan',
    relation: "Eric Sheridan's brother",
    match: 'Courtney Sheridan',
    treeGroup: 'Current Generation',
  },
];

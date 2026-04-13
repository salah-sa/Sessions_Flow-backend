import { User, Student } from "../types";

export interface MentionableMember {
  id: string;
  userId?: string;
  name: string;
  role: "Engineer" | "Student" | "Admin";
  avatarUrl?: string;
}

/**
 * MentionEngine provides high-performance indexed lookup for group members.
 * It uses a prefix-based indexing strategy to ensure <50ms lookup latency
 * even for large group rosters.
 */
export class MentionEngine {
  private members: MentionableMember[] = [];
  private index: Map<string, number[]> = new Map(); // Prefix -> Indices in members array

  constructor(students: Student[] = [], engineer?: User) {
    this.initialize(students, engineer);
  }

  private initialize(students: Student[], engineer?: User) {
    const list: MentionableMember[] = [];

    if (engineer) {
      list.push({
        id: engineer.id,
        userId: engineer.id,
        name: engineer.name,
        role: "Engineer",
        avatarUrl: engineer.avatarUrl
      });
    }

    students.forEach(s => {
      list.push({
        id: s.id,
        userId: s.userId,
        name: s.name,
        role: "Student"
      });
    });

    this.members = list;
    this.buildIndex();
  }

  private buildIndex() {
    this.index.clear();
    
    this.members.forEach((member, idx) => {
      const name = member.name.toLowerCase();
      const parts = name.split(/\s+/);
      
      // Index full name segments and their prefixes
      parts.forEach(part => {
        for (let i = 1; i <= part.length; i++) {
          const prefix = part.substring(0, i);
          this.addToIndex(prefix, idx);
        }
      });

      // Also index starting from the beginning of the full name
      for (let i = 1; i <= Math.min(name.length, 20); i++) {
        const prefix = name.substring(0, i);
        this.addToIndex(prefix, idx);
      }
    });
  }

  private addToIndex(prefix: string, memberIdx: number) {
    if (!this.index.has(prefix)) {
      this.index.set(prefix, []);
    }
    const list = this.index.get(prefix)!;
    if (!list.includes(memberIdx)) {
      list.push(memberIdx);
    }
  }

  /**
   * Performs an O(log N) or O(1) lookup for members matching a query string.
   */
  public search(query: string): MentionableMember[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.members;

    const indices = this.index.get(q) || [];
    return indices.map(idx => this.members[idx]);
  }

  public getMemberById(id: string): MentionableMember | undefined {
    return this.members.find(m => m.id === id || m.userId === id);
  }

  public getAllMembers(): MentionableMember[] {
    return this.members;
  }

  /**
   * Converts raw text and mentions into a deterministic MessageBlock array.
   * This removes the need for index-based parsing during rendering.
   */
  public static buildBlocks(text: string, mentions: any[]): any[] {
    if (!mentions || mentions.length === 0) {
      return [{ type: "text", content: text }];
    }

    const sortedMentions = [...mentions].sort((a, b) => a.indices[0] - b.indices[0]);
    const blocks: any[] = [];
    let lastIndex = 0;

    sortedMentions.forEach((mention) => {
      const [start, end] = mention.indices;

      if (start > lastIndex) {
        blocks.push({ type: "text", content: text.substring(lastIndex, start) });
      }

      blocks.push({
        type: "mention",
        userId: mention.userId,
        name: mention.name,
        role: mention.role
      });

      lastIndex = end;
    });

    if (lastIndex < text.length) {
      blocks.push({ type: "text", content: text.substring(lastIndex) });
    }

    return blocks;
  }
}

// Factory for component use
export const createMentionEngine = (students: Student[], engineer?: User) => {
  return new MentionEngine(students, engineer);
};

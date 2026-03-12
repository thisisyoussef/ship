import type { QueryResult, QueryResultRow } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type IssueLookupRow = {
  id: string;
  ticket_number: number;
};

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn<(text: string, values?: unknown[]) => Promise<QueryResult<IssueLookupRow>>>(),
}));

// Mock pool before importing the module
vi.mock('../db/client.js', () => ({
  pool: {
    query: queryMock,
  },
}));

import { pool } from '../db/client.js';
import {
  transformIssueLinks,
  type TipTapDoc,
  type TipTapMark,
  type TipTapNode,
} from '../utils/transformIssueLinks.js';

function createQueryResult<Row extends QueryResultRow>(rows: Row[]): QueryResult<Row> {
  return {
    command: 'SELECT',
    rowCount: rows.length,
    oid: 0,
    fields: [],
    rows,
  };
}

function mockIssueLookup(...rows: IssueLookupRow[]): void {
  queryMock.mockResolvedValueOnce(createQueryResult(rows));
}

function textNode(text: string, marks?: TipTapMark[]): TipTapNode {
  return marks ? { type: 'text', text, marks } : { type: 'text', text };
}

function paragraph(text: string, marks?: TipTapMark[]): TipTapNode {
  return {
    type: 'paragraph',
    content: [textNode(text, marks)],
  };
}

function createDoc(...content: TipTapNode[]): TipTapDoc {
  return {
    type: 'doc',
    content,
  };
}

function getDocContent(doc: TipTapDoc): TipTapNode[] {
  return doc.content ?? [];
}

function getNodeContent(node: TipTapNode | undefined, label: string): TipTapNode[] {
  if (!node?.content) {
    throw new Error(`${label} content missing`);
  }

  return node.content;
}

function findTextNode(nodes: TipTapNode[] | undefined, text: string): TipTapNode | undefined {
  return nodes?.find((node) => node.text === text);
}

function getLinkMark(node: TipTapNode | undefined, label: string): TipTapMark {
  const linkMark = node?.marks?.find((mark) => mark.type === 'link');
  if (!linkMark) {
    throw new Error(`${label} link mark missing`);
  }

  return linkMark;
}

function getLinkHref(node: TipTapNode | undefined, label: string): string {
  const href = getLinkMark(node, label).attrs?.href;
  if (typeof href !== 'string') {
    throw new Error(`${label} href missing`);
  }

  return href;
}

describe('transformIssueLinks', () => {
  const workspaceId = 'test-workspace-id';

  beforeEach(() => {
    vi.clearAllMocks();
    queryMock.mockReset();
  });

  describe('pattern matching and transformation', () => {
    it('transforms #123 pattern to clickable link', async () => {
      const content = createDoc(paragraph('See #42 for details'));

      mockIssueLookup({ id: 'issue-uuid-42', ticket_number: 42 });

      const result = await transformIssueLinks(content, workspaceId);
      const nodes = getNodeContent(getDocContent(result)[0], 'first paragraph');

      expect(nodes).toHaveLength(3);
      expect(nodes[0]).toEqual(textNode('See '));
      expect(nodes[1]).toEqual({
        type: 'text',
        text: '#42',
        marks: [
          {
            type: 'link',
            attrs: {
              href: '/issues/issue-uuid-42',
              target: '_self',
            },
          },
        ],
      });
      expect(nodes[2]).toEqual(textNode(' for details'));
    });

    it('transforms "issue #123" pattern to clickable link', async () => {
      const content = createDoc(paragraph('Fixed in issue #100'));

      mockIssueLookup({ id: 'issue-uuid-100', ticket_number: 100 });

      const result = await transformIssueLinks(content, workspaceId);
      const nodes = getNodeContent(getDocContent(result)[0], 'first paragraph');

      expect(nodes[1]).toEqual({
        type: 'text',
        text: 'issue #100',
        marks: [
          {
            type: 'link',
            attrs: {
              href: '/issues/issue-uuid-100',
              target: '_self',
            },
          },
        ],
      });
    });

    it('transforms "ISS-123" pattern to clickable link', async () => {
      const content = createDoc(paragraph('Related to ISS-500'));

      mockIssueLookup({ id: 'issue-uuid-500', ticket_number: 500 });

      const result = await transformIssueLinks(content, workspaceId);
      const nodes = getNodeContent(getDocContent(result)[0], 'first paragraph');

      expect(nodes[1]).toEqual({
        type: 'text',
        text: 'ISS-500',
        marks: [
          {
            type: 'link',
            attrs: {
              href: '/issues/issue-uuid-500',
              target: '_self',
            },
          },
        ],
      });
    });

    it('transforms multiple issue references in same text', async () => {
      const content = createDoc(paragraph('See #10, #20, and issue #30'));

      mockIssueLookup(
        { id: 'issue-uuid-10', ticket_number: 10 },
        { id: 'issue-uuid-20', ticket_number: 20 },
        { id: 'issue-uuid-30', ticket_number: 30 }
      );

      const result = await transformIssueLinks(content, workspaceId);
      const nodes = getNodeContent(getDocContent(result)[0], 'first paragraph');

      expect(findTextNode(nodes, '#10')?.marks).toBeDefined();
      expect(findTextNode(nodes, '#20')?.marks).toBeDefined();
      expect(findTextNode(nodes, 'issue #30')?.marks).toBeDefined();
    });

    it('queries database for all unique ticket numbers', async () => {
      const content = createDoc(paragraph('#1 and #2 and #3'));

      mockIssueLookup();

      await transformIssueLinks(content, workspaceId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ticket_number = ANY'),
        [workspaceId, expect.arrayContaining([1, 2, 3])]
      );
    });

    it('deduplicates ticket numbers in query', async () => {
      const content = createDoc(paragraph('#5 and #5 and #5'));

      mockIssueLookup();

      await transformIssueLinks(content, workspaceId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ticket_number = ANY'),
        [workspaceId, [5]]
      );
    });
  });

  describe('edge cases', () => {
    it('does not transform text that already has marks', async () => {
      const content = createDoc(
        paragraph('#99 is already a link', [{ type: 'link', attrs: { href: '/somewhere' } }])
      );

      mockIssueLookup({ id: 'issue-uuid-99', ticket_number: 99 });

      const result = await transformIssueLinks(content, workspaceId);
      const nodes = getNodeContent(getDocContent(result)[0], 'first paragraph');

      expect(nodes[0]).toEqual({
        type: 'text',
        text: '#99 is already a link',
        marks: [{ type: 'link', attrs: { href: '/somewhere' } }],
      });
      expect(pool.query).toHaveBeenCalled();
    });

    it('keeps issue reference as plain text when issue does not exist', async () => {
      const content = createDoc(paragraph('Non-existent #999'));

      mockIssueLookup();

      const result = await transformIssueLinks(content, workspaceId);

      expect(result).toEqual(content);
      expect(getNodeContent(getDocContent(result)[0], 'first paragraph')[0]?.text).toBe('Non-existent #999');
      expect(getNodeContent(getDocContent(result)[0], 'first paragraph')[0]?.marks).toBeUndefined();
    });

    it('transforms existing issues but not non-existent ones', async () => {
      const content = createDoc(paragraph('See #50 and #999'));

      mockIssueLookup({ id: 'issue-uuid-50', ticket_number: 50 });

      const result = await transformIssueLinks(content, workspaceId);
      const nodes = getNodeContent(getDocContent(result)[0], 'first paragraph');

      expect(findTextNode(nodes, '#50')?.marks).toBeDefined();
      expect(findTextNode(nodes, '#999')?.marks).toBeUndefined();
    });

    it('returns unchanged content when no issue patterns found', async () => {
      const content = createDoc(paragraph('No issue references here'));

      const result = await transformIssueLinks(content, workspaceId);

      expect(pool.query).not.toHaveBeenCalled();
      expect(result).toEqual(content);
    });

    it('returns unchanged content for invalid input', async () => {
      expect(await transformIssueLinks(null, workspaceId)).toBeNull();
      expect(await transformIssueLinks(undefined, workspaceId)).toBeUndefined();
      expect(await transformIssueLinks('string', workspaceId)).toBe('string');
      expect(await transformIssueLinks(123, workspaceId)).toBe(123);
    });

    it('returns unchanged content when not a doc type', async () => {
      const content = {
        type: 'paragraph',
        content: [textNode('#123')],
      };

      const result = await transformIssueLinks(content, workspaceId);

      expect(result).toEqual(content);
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('handles empty document content', async () => {
      const content: TipTapDoc = {
        type: 'doc',
        content: [],
      };

      const result = await transformIssueLinks(content, workspaceId);

      expect(result).toEqual(content);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('nested content structures', () => {
    it('transforms issue links in nested paragraphs', async () => {
      const content = createDoc({
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [paragraph('Item with #25')],
          },
        ],
      });

      mockIssueLookup({ id: 'issue-uuid-25', ticket_number: 25 });

      const result = await transformIssueLinks(content, workspaceId);
      const bulletList = getDocContent(result)[0];
      const listItem = getNodeContent(bulletList, 'bullet list')[0];
      const nestedParagraph = getNodeContent(listItem, 'list item')[0];
      const paragraphContent = getNodeContent(nestedParagraph, 'nested paragraph');
      const link = findTextNode(paragraphContent, '#25');

      expect(link?.marks).toBeDefined();
      expect(getLinkHref(link, '#25')).toBe('/issues/issue-uuid-25');
    });

    it('transforms issue links in blockquotes', async () => {
      const content = createDoc({
        type: 'blockquote',
        content: [paragraph('Quoted text with issue #77')],
      });

      mockIssueLookup({ id: 'issue-uuid-77', ticket_number: 77 });

      const result = await transformIssueLinks(content, workspaceId);
      const blockquote = getDocContent(result)[0];
      const nestedParagraph = getNodeContent(blockquote, 'blockquote')[0];
      const paragraphContent = getNodeContent(nestedParagraph, 'blockquote paragraph');
      const link = findTextNode(paragraphContent, 'issue #77');

      expect(link?.marks).toBeDefined();
    });

    it('recursively transforms all nested issue references', async () => {
      const content = createDoc(
        paragraph('Top level #1'),
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [paragraph('Nested #2')],
            },
          ],
        }
      );

      mockIssueLookup(
        { id: 'issue-uuid-1', ticket_number: 1 },
        { id: 'issue-uuid-2', ticket_number: 2 }
      );

      await transformIssueLinks(content, workspaceId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.anything(),
        [workspaceId, expect.arrayContaining([1, 2])]
      );
    });
  });

  describe('workspace isolation', () => {
    it('only looks up issues in the specified workspace', async () => {
      const content = createDoc(paragraph('#123'));

      mockIssueLookup();

      await transformIssueLinks(content, workspaceId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('workspace_id = $1'),
        [workspaceId, [123]]
      );
    });

    it('does not transform issues from other workspaces', async () => {
      const content = createDoc(paragraph('#888'));

      mockIssueLookup();

      const result = await transformIssueLinks(content, workspaceId);
      const textNodeResult = getNodeContent(getDocContent(result)[0], 'first paragraph')[0];

      expect(textNodeResult?.marks).toBeUndefined();
    });
  });

  describe('case variations', () => {
    it('handles "issue #" with various casings', async () => {
      const content = createDoc(paragraph('Issue #5 and ISSUE #6'));

      mockIssueLookup(
        { id: 'issue-uuid-5', ticket_number: 5 },
        { id: 'issue-uuid-6', ticket_number: 6 }
      );

      const result = await transformIssueLinks(content, workspaceId);
      const nodes = getNodeContent(getDocContent(result)[0], 'first paragraph');

      expect(findTextNode(nodes, 'Issue #5')?.marks).toBeDefined();
      expect(findTextNode(nodes, 'ISSUE #6')?.marks).toBeDefined();
    });
  });

  describe('performance considerations', () => {
    it('does not query database when no patterns detected', async () => {
      const content = createDoc(paragraph('Just normal text without issue refs'));

      const result = await transformIssueLinks(content, workspaceId);

      expect(pool.query).not.toHaveBeenCalled();
      expect(result).toEqual(content);
    });

    it('makes single batch query for multiple issues', async () => {
      const content = createDoc(paragraph('#1 #2 #3 #4 #5'));

      mockIssueLookup();

      await transformIssueLinks(content, workspaceId);

      expect(pool.query).toHaveBeenCalledTimes(1);
    });
  });
});

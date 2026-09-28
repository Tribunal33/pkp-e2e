#!/usr/bin/env python3
# U74 claim check K6: a Native XML export file (OMP) as JSON, one entry per publication format,
# with the format's ONIX product written as a compact outline ("Tag=text", "Tag{child; child}").
# Usage: python3 parse-native.py <file.xml>   (prints JSON on stdout)
import json
import sys
import xml.etree.ElementTree as ET

PKP = '{http://pkp.sfu.ca}'


def local(tag):
    return tag.split('}', 1)[1] if '}' in tag else tag


def outline(el):
    kids = list(el)
    name = local(el.tag)
    attrs = ''.join(f'[{local(k)}={v}]' for k, v in el.attrib.items() if not k.startswith('{http://www.w3.org'))
    if not kids:
        t = (el.text or '').strip()
        return f'{name}{attrs}={t}' if t else f'{name}{attrs}'
    return f'{name}{attrs}{{' + '; '.join(outline(k) for k in kids) + '}'


def children(el, name):
    return [k for k in el if local(k.tag) == name]


def find_all(el, name):
    return [k for k in el.iter() if local(k.tag) == name]


def parent_path(root, target):
    # the chain of local tag names from the product down to the target's parent
    stack = [(root, [local(root.tag)])]
    while stack:
        node, path = stack.pop()
        for k in node:
            if k is target:
                return ' > '.join(path)
            stack.append((k, path + [local(k.tag)]))
    return None


def main():
    tree = ET.parse(sys.argv[1])
    root = tree.getroot()
    out = {'root': local(root.tag), 'formats': []}
    books = [root] if local(root.tag) == 'monograph' else children(root, 'monograph')
    for b in books:
        for pub in children(b, 'publication'):
            title = ' '.join(t.text or '' for t in children(pub, 'title'))
            formats = children(pub, 'publication_format')
            for f in formats:
                name = ' '.join((n.text or '') for n in children(f, 'name'))
                prods = [k for k in f if local(k.tag) == 'Product']
                entry = {
                    'book': title.strip(),
                    'publication': pub.attrib.get('version'),
                    'pubStatus': pub.attrib.get('status'),
                    'format': name.strip(),
                    'approved': f.attrib.get('approved'),
                    'available': f.attrib.get('available'),
                    'products': len(prods),
                }
                if prods:
                    p = prods[0]
                    entry['topLevel'] = [local(k.tag) for k in p]
                    entry['audience'] = [outline(x) for x in find_all(p, 'Audience')]
                    entry['audienceRange'] = [outline(x) for x in find_all(p, 'AudienceRange')]
                    entry['salesRights'] = [outline(x) for x in find_all(p, 'SalesRights')]
                    entry['rowSalesRightsType'] = [{'value': (x.text or '').strip(), 'parent': parent_path(p, x)} for x in find_all(p, 'ROWSalesRightsType')]
                    entry['productSupply'] = [outline(x) for x in find_all(p, 'ProductSupply')]
                    entry['productIdentifier'] = [outline(x) for x in children(p, 'ProductIdentifier')]
                    dd = (children(p, 'DescriptiveDetail') or [None])[0]
                    entry['descriptiveDetail'] = outline(dd) if dd is not None else None
                    pd = (children(p, 'PublishingDetail') or [None])[0]
                    entry['publishingDetail'] = outline(pd) if pd is not None else None
                    entry['relatedMaterial'] = [outline(x) for x in children(p, 'RelatedMaterial')]
                    entry['allText'] = ' '.join((x.text or '').strip() for x in p.iter() if (x.text or '').strip())
                    entry['allTags'] = sorted({local(x.tag) for x in p.iter()})
                out['formats'].append(entry)
    print(json.dumps(out))


main()

import { LicenseEntry } from './types';

export const LICENSES: LicenseEntry[] = [
  {
    spdx: 'MIT',
    name: 'MIT License',
    osiApproved: true,
    copyleft: false,
    permissive: true,
    link: 'https://opensource.org/licenses/MIT',
    summary: 'Highly permissive, allows reuse with attribution and license notice.',
    compatibility: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'MPL-2.0']
  },
  {
    spdx: 'Apache-2.0',
    name: 'Apache License 2.0',
    osiApproved: true,
    copyleft: false,
    permissive: true,
    link: 'https://www.apache.org/licenses/LICENSE-2.0',
    summary: 'Permissive with explicit patent grant and notice requirements.',
    notes: 'Widely used in industry for libraries and services.',
    compatibility: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause']
  },
  {
    spdx: 'BSD-3-Clause',
    name: 'BSD 3-Clause',
    osiApproved: true,
    copyleft: false,
    permissive: true,
    link: 'https://opensource.org/licenses/BSD-3-Clause',
    summary: 'Permissive; similar to MIT with non-endorsement clause.',
    compatibility: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause']
  },
  {
    spdx: 'MPL-2.0',
    name: 'Mozilla Public License 2.0',
    osiApproved: true,
    copyleft: true,
    permissive: false,
    link: 'https://www.mozilla.org/en-US/MPL/2.0/',
    summary: 'File-level copyleft; modifications to MPL files must remain MPL.',
    notes: 'Often viewed as business-friendly copyleft.',
    compatibility: ['MPL-2.0', 'MIT', 'Apache-2.0']
  },
  {
    spdx: 'GPL-3.0',
    name: 'GNU General Public License v3.0',
    osiApproved: true,
    copyleft: true,
    permissive: false,
    link: 'https://www.gnu.org/licenses/gpl-3.0.en.html',
    summary: 'Strong copyleft; derivative works must be GPL.',
    notes: 'Can be incompatible with some proprietary distribution models.'
  },
  {
    spdx: 'AGPL-3.0',
    name: 'GNU Affero General Public License v3.0',
    osiApproved: true,
    copyleft: true,
    permissive: false,
    link: 'https://www.gnu.org/licenses/agpl-3.0.en.html',
    summary: 'Network copyleft; SaaS usage triggers source distribution obligations.'
  },
  {
    spdx: 'CC-BY-SA-4.0',
    name: 'Creative Commons Attribution-ShareAlike 4.0',
    osiApproved: false,
    copyleft: true,
    permissive: false,
    link: 'https://creativecommons.org/licenses/by-sa/4.0/',
    summary: 'For content/assets; requires attribution and share-alike on derivatives.'
  }
];

export function getLicenseBySpdx(spdx: string) {
  return LICENSES.find(l => l.spdx.toLowerCase() === spdx.toLowerCase());
}


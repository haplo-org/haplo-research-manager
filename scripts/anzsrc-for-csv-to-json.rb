# Haplo Research Manager                            https://haplo.org
# (c) Haplo Services Ltd 2006 - 2021           https://www.haplo.com
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# prepare the codes for this script by:
# - finding the excel files for ANZSRC FoR classifications from the official website
# - the 2008 ones came in three files, levels 1, 2, and 3. These need to be put into one spreadsheet,
#    so copy/paste level 2 codes at the bottom of level 1, and level 3 after that. This ensures that
#    the JSON is structured to have the parents created before the children.
# - no other header fields should be present. In the end you have two long columns, one with code and one with title.
# - export to csv.

require 'json'

codes = {}

f = File.open("anzsrc-for.csv");

f.readlines.each do |l|
  row = l.split(/\,/)
  codes[row[0]] = row[1]
end

puts JSON.pretty_generate(codes).gsub(/\\\"/, "").gsub(/\\r\\n/, "").gsub(/M_ori/, "Māori")

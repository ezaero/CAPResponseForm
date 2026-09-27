const squadronList = [
  { code: 'CO-072', squadronName: 'Boulder Composite Squadron', city: 'Boulder', charterNumber: 'RMR-CO-072', groupName: 'Group 1 - Northern Colorado' },
  { code: 'CO-191', squadronName: 'Platte Valley Cadet Squadron', city: 'Ft. Lupton', charterNumber: 'RMR-CO-191', groupName: 'Group 1 - Northern Colorado' },
  { code: 'CO-099', squadronName: 'Broomfield Composite Squadron', city: 'Broomfield', charterNumber: 'RMR-CO-099', groupName: 'Group 1 - Northern Colorado' },
  { code: 'CO-136', squadronName: 'Jefferson County Senior Squadron', city: 'Broomfield', charterNumber: 'RMR-CO-136', groupName: 'Group 1 - Northern Colorado' },
  { code: 'CO-147', squadronName: 'Thompson Valley Composite Squadron', city: 'Fort Collins', charterNumber: 'RMR-CO-147', groupName: 'Group 1 - Northern Colorado' },
  { code: 'CO-022', squadronName: 'Vance Brand Cadet Squadron', city: 'Longmont', charterNumber: 'RMR-CO-022', groupName: 'Group 1 - Northern Colorado' },
  { code: 'CO-068', squadronName: 'North Valley Composite Squadron', city: 'Thornton', charterNumber: 'RMR-CO-068', groupName: 'Group 1 - Northern Colorado' },
  { code: 'CO-053', squadronName: 'Eagle County Composite Squadron', city: 'Gypsum', charterNumber: 'RMR-CO-053', groupName: 'Group 2 - Western Slope' },
  { code: 'CO-015', squadronName: 'Thunder Mountain Composite Squadron', city: 'Grand Junction', charterNumber: 'RMR-CO-015', groupName: 'Group 2 - Western Slope' },
  { code: 'CO-189', squadronName: 'Mesa Verde Composite Squadron', city: 'Cortez', charterNumber: 'RMR-CO-189', groupName: 'Group 2 - Western Slope' },
  { code: 'CO-141', squadronName: 'Montrose Composite Squadron', city: 'Montrose', charterNumber: 'RMR-CO-141', groupName: 'Group 2 - Western Slope' },
  { code: 'CO-181', squadronName: 'Steamboat Springs Composite Squadron', city: 'Steamboat Springs', charterNumber: 'RMR-CO-181', groupName: 'Group 2 - Western Slope' },
  { code: 'CO-805', squadronName: 'Colorado Military Academy', city: 'Colorado Springs', charterNumber: 'RMR-CO-805', groupName: 'Group 3 - Southern Colorado' },
  { code: 'CO-098', squadronName: 'Freemont Starfire Cadet Squadron', city: 'Penrose', charterNumber: 'RMR-CO-098', groupName: 'Group 3 - Southern Colorado' },
  { code: 'CO-030', squadronName: 'Colorado Springs Cadet Squadron', city: 'Peterson SFB', charterNumber: 'RMR-CO-030', groupName: 'Group 3 - Southern Colorado' },
  { code: 'CO-080', squadronName: 'Pikes Peak Composite Squadron', city: 'Peterson Space Force Base', charterNumber: 'RMR-CO-080', groupName: 'Group 3 - Southern Colorado' },
  { code: 'CO-159', squadronName: 'Air Academy Cadet Squadron', city: 'USAF Academy', charterNumber: 'RMR-CO-159', groupName: 'Group 3 - Southern Colorado' },
  { code: 'CO-807', squadronName: 'Merit Academy Cadet Squadron', city: 'Woodland Park', charterNumber: 'RMR-CO-807', groupName: 'Group 3 - Southern Colorado' },
  { code: 'CO-200', squadronName: 'The Fireborn Cadet Squadron', city: 'Aurora', charterNumber: 'RMR-CO-200', groupName: 'Group 4 - Central Colorado' },
  { code: 'CO-143', squadronName: 'Mile High Cadet Squadron', city: 'Buckley SFB', charterNumber: 'RMR-CO-143', groupName: 'Group 4 - Central Colorado' },
  { code: 'CO-157', squadronName: 'Castle Rock Cadet Squadron', city: 'Castle Rock', charterNumber: 'RMR-CO-157', groupName: 'Group 4 - Central Colorado' },
  { code: 'CO-148', squadronName: 'Mustang Cadet Squadron', city: 'Centennial', charterNumber: 'RMR-CO-148', groupName: 'Group 4 - Central Colorado' },
  { code: 'CO-162', squadronName: 'Black Sheep Senior Squadron', city: 'Centennial', charterNumber: 'RMR-CO-162', groupName: 'Group 4 - Central Colorado' },
  { code: 'CO-183', squadronName: 'Valkyrie Cadet Squadron', city: 'Denver', charterNumber: 'RMR-CO-183', groupName: 'Group 4 - Central Colorado' },
  { code: 'CO-031', squadronName: 'Foothills Cadet Squadron', city: 'Lakewood', charterNumber: 'RMR-CO-031', groupName: 'Group 4 - Central Colorado' },
  { code: 'CO-163', squadronName: 'Highlander Composite Squadron', city: 'Littleton', charterNumber: 'RMR-CO-163', groupName: 'Group 4 - Central Colorado' },
  { code: 'CO-186', squadronName: 'Dakota Ridge Composite Squadron', city: 'Littleton', charterNumber: 'RMR-CO-186', groupName: 'Group 4 - Central Colorado' },
  { code: 'CO-173', squadronName: 'Parker Composite Squadron', city: 'Parker', charterNumber: 'RMR-CO-173', groupName: 'Group 4 - Central Colorado' }
];

function getSquadronByCode(code) {
  return squadronList.find((squadron) => squadron.code === code) || null;
}

function getRecruitingEmail(code) {
  const squadron = getSquadronByCode(code);
  if (!squadron) {
    return null;
  }
  return `${code.toLowerCase()}-recruiting@cowg.cap.gov`;
}

module.exports = {
  squadronList,
  getSquadronByCode,
  getRecruitingEmail
};

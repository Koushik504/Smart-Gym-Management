// Run with mongosh YOUR_URI --file database/queries/aggregations.mongosh.js
// Read-only examples. Replace memberIds with IDs returned by MySQL, not names/emails.
const gym = db.getSiblingDB('smart_gym');
const memberIds = gym.workout_logs.distinct('memberId');
const since = new Date(Date.now() - 90 * 86400000);
print('Monthly workout completion and duration');
printjson(gym.workout_logs.aggregate([
  {$match:{memberId:{$in:memberIds},date:{$gte:since}}},
  {$group:{_id:{$dateToString:{format:'%Y-%m',date:'$date'}},sessions:{$sum:1},minutes:{$sum:'$durationMinutes'},completed:{$sum:{$cond:[{$eq:['$status','COMPLETED']},1,0]}}}},
  {$sort:{_id:1}}
]).toArray());
print('Exercise workload from completed exercise entries');
printjson(gym.workout_logs.aggregate([
  {$match:{date:{$gte:since}}},{$unwind:'$entries'},
  {$group:{_id:'$entries.exerciseId',completed:{$sum:{$cond:['$entries.completed',1,0]}},volume:{$sum:{$cond:['$entries.completed',{$multiply:['$entries.sets','$entries.reps','$entries.weight']},0]}}}},
  {$sort:{volume:-1}}
]).toArray());
print('Activity counts by event type');
printjson(gym.activity_events.aggregate([
  {$match:{timestamp:{$gte:since}}},{$group:{_id:'$type',events:{$sum:1},latest:{$max:'$timestamp'}}},{$sort:{events:-1}}
]).toArray());
